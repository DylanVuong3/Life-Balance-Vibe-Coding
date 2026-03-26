import React, { useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Pressable, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useStore } from '../store';
import { ScoredTask } from '../types';
import { Colors, Fonts, Spacing, Radius, Common } from '../theme';
import type { RootStackParamList } from '../navigation';

type Nav = NativeStackNavigationProp<RootStackParamList>;

// ─── Helpers ───────────────────────────────────────────────────────────────────

function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}

function DeadlineBadge({ deadline }: { deadline: string }) {
  const days = daysUntil(deadline);
  const overdue  = days < 0;
  const today    = days === 0;
  const soon     = days <= 3;

  const bg   = overdue ? Colors.red       : soon ? Colors.amber       : Colors.ink4 + '22';
  const fg   = overdue ? '#fff'           : soon ? Colors.amberLight  : Colors.ink4;
  const text = overdue ? 'overdue' : today ? 'today' : `${days}d`;

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color: fg }]}>{text}</Text>
    </View>
  );
}

// ─── Queue row ─────────────────────────────────────────────────────────────────

interface RowProps {
  item: ScoredTask;
  rank: number;
  maxScore: number;
  onPress: () => void;
  onComplete: () => void;
}

const QueueRow = React.memo(function QueueRow({ item, rank, maxScore, onPress, onComplete }: RowProps) {
  const pct = maxScore > 0 ? (item.score / maxScore) : 0;
  const neglected = item.neglectMultiplier > 1.5;

  return (
    <TouchableOpacity
      style={[styles.row, rank === 1 && styles.rowTop]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Rank */}
      <Text style={[styles.rank, rank === 1 && styles.rankTop]}>
        {rank}
      </Text>

      {/* Body */}
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle} numberOfLines={2}>{item.title}</Text>

        {/* Meta badges */}
        <View style={styles.metaRow}>
          <View style={[styles.badge, { backgroundColor: item.tliColor + '22' }]}>
            <Text style={[styles.badgeText, { color: item.tliColor }]}>{item.tliTitle}</Text>
          </View>
          {item.deadline && <DeadlineBadge deadline={item.deadline} />}
          {neglected && !item.deadline && (
            <View style={[styles.badge, { backgroundColor: Colors.amberLight }]}>
              <Text style={[styles.badgeText, { color: Colors.amber }]}>neglected</Text>
            </View>
          )}
          <Text style={styles.effortLabel}>{item.effortSize}</Text>
        </View>

        {/* Score bar */}
        <View style={styles.scoreTrack}>
          <View style={[styles.scoreFill, { width: `${Math.round(pct * 100)}%`, backgroundColor: item.tliColor }]} />
        </View>
      </View>

      {/* Complete button */}
      <TouchableOpacity
        style={styles.checkBtn}
        onPress={onComplete}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text style={styles.checkIcon}>✓</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
});

// ─── Screen ────────────────────────────────────────────────────────────────────

export default function QueueScreen() {
  const navigation = useNavigation<Nav>();
  const { queue, completeTask, activePlaceIds, places } = useStore();

  const maxScore = queue[0]?.score ?? 1;

  const handleComplete = useCallback(async (task: ScoredTask) => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await completeTask(task.id);
  }, [completeTask]);

  const renderItem = useCallback(({ item, index }: { item: ScoredTask; index: number }) => (
    <QueueRow
      item={item}
      rank={index + 1}
      maxScore={maxScore}
      onPress={() => navigation.navigate('TaskDetail', { taskId: item.id })}
      onComplete={() => handleComplete(item)}
    />
  ), [maxScore, navigation, handleComplete]);

  return (
    <SafeAreaView style={Common.screen} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Priority queue</Text>
          <Text style={styles.headerSub}>What to work on right now</Text>
        </View>
        <TouchableOpacity
          style={Common.btnPrimary}
          onPress={() => navigation.navigate('TaskForm', { parentId: null })}
        >
          <Text style={Common.btnPrimaryText}>+ Goal</Text>
        </TouchableOpacity>
      </View>

      {/* Active place filters */}
      {activePlaceIds.length > 0 && (
        <View style={styles.filterBar}>
          <Text style={styles.filterLabel}>Filtered:</Text>
          {activePlaceIds.map(id => {
            const p = places.find(pl => pl.id === id);
            return p ? (
              <View key={id} style={[styles.badge, { backgroundColor: p.color + '22' }]}>
                <Text style={[styles.badgeText, { color: p.color }]}>{p.name}</Text>
              </View>
            ) : null;
          })}
        </View>
      )}

      {queue.length === 0 ? (
        <View style={Common.empty}>
          <Text style={styles.emptyIcon}>✓</Text>
          <Text style={Common.emptyTitle}>All clear</Text>
          <Text style={Common.emptySub}>No pending tasks. Add goals in the Tree tab.</Text>
        </View>
      ) : (
        <FlatList
          data={queue}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          // "Right now" callout
          ListHeaderComponent={() => (
            <View style={styles.nowCard}>
              <Text style={styles.nowLabel}>RIGHT NOW</Text>
              <Text style={styles.nowTitle}>{queue[0].title}</Text>
              <Text style={styles.nowMeta}>{queue[0].tliTitle} · {queue[0].effortSize}</Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.rule,
  },
  headerTitle: {
    fontFamily: Fonts.display,
    fontSize: 22,
    color: Colors.ink,
    letterSpacing: -0.3,
  },
  headerSub: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    color: Colors.ink4,
    marginTop: 1,
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.rule,
    flexWrap: 'wrap',
  },
  filterLabel: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    color: Colors.ink4,
  },
  list: {
    padding: Spacing.md,
    gap: 2,
  },
  nowCard: {
    backgroundColor: Colors.paper2,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.rule,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  nowLabel: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    color: Colors.ink4,
    letterSpacing: 1,
    marginBottom: 4,
  },
  nowTitle: {
    fontFamily: Fonts.mono,
    fontSize: 16,
    fontWeight: '500',
    color: Colors.ink,
    marginBottom: 4,
  },
  nowMeta: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    color: Colors.ink3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.md,
    borderRadius: Radius.md,
    gap: Spacing.sm,
    marginBottom: 2,
  },
  rowTop: {
    backgroundColor: Colors.paper2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.rule,
  },
  rank: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    color: Colors.ink4,
    paddingTop: 2,
    width: 18,
    textAlign: 'right',
  },
  rankTop: {
    color: Colors.ink2,
    fontWeight: '500',
  },
  rowBody: {
    flex: 1,
    gap: 4,
  },
  rowTitle: {
    fontFamily: Fonts.mono,
    fontSize: 13,
    color: Colors.ink,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  badge: {
    borderRadius: Radius.sm,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  badgeText: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    fontWeight: '500',
  },
  effortLabel: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    color: Colors.ink4,
  },
  scoreTrack: {
    height: 3,
    backgroundColor: Colors.rule,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 2,
  },
  scoreFill: {
    height: 3,
    borderRadius: 2,
  },
  checkBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.rule,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkIcon: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.ink4,
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: Spacing.sm,
    opacity: 0.3,
  },
});
