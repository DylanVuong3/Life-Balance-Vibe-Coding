import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';

import { useStore } from '../store';
import { assignTliColors, getTliId } from '../engine';
import { Colors, Fonts, Spacing, Radius, Common } from '../theme';
import type { RootStackParamList } from '../navigation';

type Nav   = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'TaskDetail'>;

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}

// ─── Stat box ──────────────────────────────────────────────────────────────────

function StatBox({ value, label, color }: { value: string; label: string; color?: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={[styles.statVal, color ? { color } : {}]}>{value}</Text>
      <Text style={styles.statLbl}>{label}</Text>
    </View>
  );
}

// ─── Score breakdown ───────────────────────────────────────────────────────────

function ScoreBreakdown({ task }: { task: ReturnType<typeof useStore.getState>['queue'][number] }) {
  const rows = [
    { label: 'Effective importance', value: `${(task.effectiveImportance * 100).toFixed(1)}%`, alert: false },
    { label: 'Neglect multiplier',   value: `${task.neglectMultiplier.toFixed(2)}×`,            alert: task.neglectMultiplier > 1.5 },
    { label: 'Deadline multiplier',  value: `${task.deadlineMultiplier.toFixed(2)}×`,            alert: task.deadlineMultiplier > 2 },
    { label: 'Priority score',       value: task.score.toFixed(3),                               alert: false, bold: true },
  ];

  return (
    <View style={styles.breakdownCard}>
      {rows.map((r, i) => (
        <View key={r.label} style={[styles.breakdownRow, i < rows.length - 1 && styles.breakdownRowBorder]}>
          <Text style={styles.breakdownLabel}>{r.label}</Text>
          <Text style={[styles.breakdownValue, r.alert && { color: Colors.amber }, r.bold && { fontFamily: Fonts.monoMedium }]}>
            {r.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

// ─── Screen ────────────────────────────────────────────────────────────────────

export default function TaskDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route      = useRoute<Route>();
  const { taskId } = route.params;

  const { tasks, places, queue, completeTask, reopenTask, deleteTask } = useStore();
  const task = tasks.find(t => t.id === taskId);

  if (!task) {
    return (
      <SafeAreaView style={Common.screen} edges={['bottom']}>
        <View style={Common.empty}>
          <Text style={Common.emptyTitle}>Task not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const scored     = queue.find(q => q.id === taskId);
  const tlis       = tasks.filter(t => t.parentId === null && !t.completedAt);
  const colorMap   = assignTliColors(tlis);
  const tliId      = getTliId(task, tasks);
  const tli        = tliId ? tasks.find(t => t.id === tliId) : null;
  const color      = tliId ? (colorMap[tliId] ?? Colors.ink4) : Colors.ink4;
  const taskPlaces = places.filter(p => task.placeIds.includes(p.id));

  // Breadcrumb path
  const crumbs: string[] = [];
  let cur: typeof task | undefined = task;
  while (cur) {
    crumbs.unshift(cur.title);
    cur = cur.parentId ? tasks.find(t => t.id === cur!.parentId) : undefined;
  }

  async function handleComplete() {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await completeTask(task!.id);
    navigation.goBack();
  }

  async function handleReopen() {
    await reopenTask(task!.id);
  }

  function handleDelete() {
    Alert.alert(
      'Delete task',
      `Delete "${task!.title}" and all its subtasks?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive', onPress: async () => {
            await deleteTask(task!.id);
            navigation.goBack();
          },
        },
      ],
    );
  }

  // Deadline display
  const deadlineDays = task.deadline ? daysUntil(task.deadline) : null;
  const deadlineColor = deadlineDays === null
    ? Colors.ink
    : deadlineDays < 0 ? Colors.red : deadlineDays <= 3 ? Colors.amber : Colors.ink;
  const deadlineStr = deadlineDays === null
    ? '—'
    : deadlineDays < 0 ? 'overdue' : deadlineDays === 0 ? 'today' : `${deadlineDays}d`;

  return (
    <SafeAreaView style={Common.screen} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>

        {/* Breadcrumb */}
        {crumbs.length > 1 && (
          <View style={styles.crumbs}>
            {crumbs.slice(0, -1).map((c, i) => (
              <React.Fragment key={i}>
                <Text style={[styles.crumbText, i === 0 && { color }]}>{c}</Text>
                <Text style={styles.crumbSep}>›</Text>
              </React.Fragment>
            ))}
          </View>
        )}

        {/* Title */}
        <Text style={[styles.title, task.completedAt && styles.titleDone]}>
          {task.completedAt ? '✓  ' : ''}{task.title}
        </Text>

        {/* TLI badge */}
        {tli && (
          <View style={styles.tliRow}>
            <View style={[styles.tliDot, { backgroundColor: color }]} />
            <Text style={[styles.tliLabel, { color }]}>{tli.title}</Text>
          </View>
        )}

        {/* Stats row */}
        <View style={styles.statRow}>
          <StatBox value={`${Math.round(task.importance * 100)}%`} label="importance" />
          <StatBox value={task.effortSize} label="effort" />
          <StatBox value={deadlineStr} label="deadline" color={deadlineColor} />
        </View>

        {/* Notes */}
        {task.notes ? (
          <View style={styles.section}>
            <Text style={Common.label}>Notes</Text>
            <Text style={[Common.bodyText, { marginTop: Spacing.sm }]}>{task.notes}</Text>
          </View>
        ) : null}

        {/* Details */}
        <View style={styles.detailsCard}>
          {task.deadline && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Deadline</Text>
              <Text style={[styles.detailValue, { color: deadlineColor }]}>{formatDate(task.deadline)}</Text>
            </View>
          )}
          {task.repeating && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Repeating</Text>
              <Text style={styles.detailValue}>Every {task.repeatDays ?? '?'} days</Text>
            </View>
          )}
          {taskPlaces.length > 0 && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Places</Text>
              <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap', flex: 1, justifyContent: 'flex-end' }}>
                {taskPlaces.map(p => (
                  <View key={p.id} style={[Common.tag, { backgroundColor: p.color + '22' }]}>
                    <Text style={[Common.tagText, { color: p.color }]}>{p.name}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Added</Text>
            <Text style={styles.detailValue}>{formatDate(task.createdAt)}</Text>
          </View>
          {task.completedAt && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Completed</Text>
              <Text style={[styles.detailValue, { color: Colors.teal }]}>{formatDate(task.completedAt)}</Text>
            </View>
          )}
        </View>

        {/* Priority breakdown — only for queued tasks */}
        {scored && (
          <View style={styles.section}>
            <Text style={[Common.label, { marginBottom: Spacing.sm }]}>Priority score breakdown</Text>
            <ScoreBreakdown task={scored} />
          </View>
        )}

      </ScrollView>

      {/* Action bar */}
      <View style={styles.actionBar}>
        {task.completedAt ? (
          <TouchableOpacity style={[Common.btnSecondary, { flex: 1 }]} onPress={handleReopen}>
            <Text style={Common.btnSecondaryText}>↩  Reopen</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[Common.btnPrimary, { flex: 1 }]} onPress={handleComplete}>
            <Text style={Common.btnPrimaryText}>✓  Mark complete</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={Common.btnSecondary}
          onPress={() => navigation.navigate('TaskForm', { taskId: task.id })}
        >
          <Text style={Common.btnSecondaryText}>✎  Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[Common.btnSecondary, { borderColor: Colors.red + '60' }]}
          onPress={handleDelete}
        >
          <Text style={[Common.btnSecondaryText, { color: Colors.red }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  content: {
    padding: Spacing.lg,
    paddingBottom: 12,
    gap: Spacing.lg,
  },
  crumbs: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 3,
  },
  crumbText: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    color: Colors.ink4,
  },
  crumbSep: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    color: Colors.ink4,
  },
  title: {
    fontFamily: Fonts.monoMedium,
    fontSize: 18,
    color: Colors.ink,
    lineHeight: 26,
    letterSpacing: -0.2,
  },
  titleDone: {
    color: Colors.ink4,
    textDecorationLine: 'line-through',
  },
  tliRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: -Spacing.sm,
  },
  tliDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  tliLabel: {
    fontFamily: Fonts.mono,
    fontSize: 12,
  },
  statRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  statBox: {
    flex: 1,
    backgroundColor: Colors.paper2,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.rule,
    padding: Spacing.md,
    alignItems: 'center',
    gap: 3,
  },
  statVal: {
    fontFamily: Fonts.monoMedium,
    fontSize: 17,
    color: Colors.ink,
  },
  statLbl: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    color: Colors.ink4,
  },
  section: {
    gap: Spacing.xs,
  },
  detailsCard: {
    backgroundColor: Colors.paper2,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.rule,
    overflow: 'hidden',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.rule,
    gap: Spacing.md,
  },
  detailLabel: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    color: Colors.ink4,
  },
  detailValue: {
    fontFamily: Fonts.mono,
    fontSize: 13,
    color: Colors.ink2,
  },
  breakdownCard: {
    backgroundColor: Colors.paper2,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.rule,
    overflow: 'hidden',
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  breakdownRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.rule,
  },
  breakdownLabel: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    color: Colors.ink4,
  },
  breakdownValue: {
    fontFamily: Fonts.mono,
    fontSize: 13,
    color: Colors.ink,
  },
  actionBar: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.rule,
    backgroundColor: Colors.paper,
  },
});
