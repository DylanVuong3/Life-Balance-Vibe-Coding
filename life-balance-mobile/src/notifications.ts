/**
 * notifications.ts
 *
 * Schedules local push notifications for:
 * - Deadlines approaching (1 day before, day-of)
 * - TLIs that haven't been touched in N days (neglect alerts)
 *
 * Call scheduleAll() after any store mutation that changes tasks or effort.
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Task, EffortLog } from './types';
import { getTliId, computeBalanceStats } from './engine';

// Configure how notifications appear when app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: true,
  }),
});

// ─── Permission ────────────────────────────────────────────────────────────────

export async function requestPermissions(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Life Balance',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

// ─── Schedule all notifications ────────────────────────────────────────────────

export async function scheduleAll(tasks: Task[], effortLogs: EffortLog[]): Promise<void> {
  const hasPermission = await requestPermissions();
  if (!hasPermission) return;

  // Cancel everything first — we reschedule from scratch
  await Notifications.cancelAllScheduledNotificationsAsync();

  const now = Date.now();
  const incomplete = tasks.filter(t => !t.completedAt);

  // ── Deadline notifications ───────────────────────────────────────────────────
  for (const task of incomplete) {
    if (!task.deadline) continue;
    const deadlineMs = new Date(task.deadline).getTime();

    // 1 day before
    const oneDayBefore = deadlineMs - 24 * 60 * 60 * 1000;
    if (oneDayBefore > now) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Deadline tomorrow',
          body: task.title,
          data: { taskId: task.id },
        },
        trigger: { date: new Date(oneDayBefore) },
      });
    }

    // Day of, at 9 AM
    const dayOf = new Date(task.deadline);
    dayOf.setHours(9, 0, 0, 0);
    if (dayOf.getTime() > now) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Due today',
          body: task.title,
          data: { taskId: task.id },
        },
        trigger: { date: dayOf },
      });
    }
  }

  // ── Neglect notifications ────────────────────────────────────────────────────
  // Fire a daily reminder at 8 AM if any TLI has had zero effort in the past 3 days
  const stats = computeBalanceStats(tasks, effortLogs);
  const threeDaysAgo = new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString();

  const neglected = stats.filter(stat => {
    const recentLogs = effortLogs.filter(
      l => l.tliId === stat.tliId && l.loggedAt > threeDaysAgo
    );
    return recentLogs.length === 0 && stat.importance > 0.15;
  });

  if (neglected.length > 0) {
    const tomorrow8am = new Date();
    tomorrow8am.setDate(tomorrow8am.getDate() + 1);
    tomorrow8am.setHours(8, 0, 0, 0);

    const names = neglected.map(s => s.title).join(', ');
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Areas getting neglected',
        body: names,
        data: { type: 'neglect' },
      },
      trigger: { date: tomorrow8am },
    });
  }
}

// ─── Badge management ─────────────────────────────────────────────────────────

export async function updateBadge(overdueCount: number): Promise<void> {
  if (Platform.OS === 'ios') {
    await Notifications.setBadgeCountAsync(overdueCount);
  }
}
