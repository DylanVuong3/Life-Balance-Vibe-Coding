import React from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, G, Text as SvgText } from 'react-native-svg';

import { useStore } from '../store';
import { Colors, Fonts, Spacing, Radius, Common } from '../theme';

const SCREEN_W = Dimensions.get('window').width;
const PIE_SIZE = Math.min((SCREEN_W - Spacing.lg * 2 - Spacing.md) / 2, 160);
const CX = PIE_SIZE / 2;
const CY = PIE_SIZE / 2;
const R  = PIE_SIZE / 2 - 4;

function pct(n: number) { return `${Math.round(n * 100)}%`; }

// ─── SVG pie chart ─────────────────────────────────────────────────────────────

function polarToCart(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function slicePath(
  cx: number, cy: number, r: number,
  startDeg: number, endDeg: number,
): string {
  const sweep = Math.min(endDeg - startDeg, 359.99);
  const start = polarToCart(cx, cy, r, startDeg);
  const end   = polarToCart(cx, cy, r, startDeg + sweep);
  const large = sweep > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y} Z`;
}

interface PieSlice { x: string; y: number; color: string; }

function PieChart({ data, title }: { data: PieSlice[]; title: string }) {
  const total   = data.reduce((s, d) => s + d.y, 0);
  const isEmpty = total < 0.001;

  let cursor = 0;
  const slices = data.map(d => {
    const sweep = isEmpty ? 0 : (d.y / total) * 360;
    const start = cursor;
    cursor += sweep;
    return { ...d, start, sweep };
  });

  return (
    <View style={styles.pieCard}>
      <Text style={styles.pieTitle}>{title}</Text>
      <Svg width={PIE_SIZE} height={PIE_SIZE}>
        {isEmpty ? (
          <Path d={slicePath(CX, CY, R, 0, 359.99)} fill={Colors.rule} />
        ) : (
          slices.map((s, i) => {
            if (s.sweep < 0.5) return null;
            const mid = s.start + s.sweep / 2;
            const lp  = polarToCart(CX, CY, R * 0.62, mid);
            return (
              <G key={i}>
                <Path
                  d={slicePath(CX, CY, R, s.start, s.start + s.sweep)}
                  fill={s.color}
                />
                {s.sweep > 28 && (
                  <SvgText
                    x={lp.x}
                    y={lp.y}
                    textAnchor="middle"
                    alignmentBaseline="middle"
                    fontSize={9}
                    fontWeight="500"
                    fill="white"
                  >
                    {pct(s.y)}
                  </SvgText>
                )}
              </G>
            );
          })
        )}
      </Svg>
    </View>
  );
}

// ─── Screen ────────────────────────────────────────────────────────────────────

export default function BalanceScreen() {
  const { balanceStats, effortLogs, tasks } = useStore();

  if (balanceStats.length === 0) {
    return (
      <SafeAreaView style={Common.screen} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Balance</Text>
          <Text style={styles.headerSub}>Target vs. actual effort this week</Text>
        </View>
        <View style={Common.empty}>
          <Text style={{ fontSize: 32, opacity: 0.3 }}>◑</Text>
          <Text style={Common.emptyTitle}>No goals yet</Text>
          <Text style={Common.emptySub}>Add top-level goals in the Tree tab first.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const targetData: PieSlice[] = balanceStats.map(s => ({ x: s.title, y: s.targetShare, color: s.color }));
  const actualData: PieSlice[] = balanceStats.map(s => ({ x: s.title, y: s.actualShare, color: s.color }));

  const weekAgo    = new Date(Date.now() - 7 * 86400000).toISOString();
  const recentLogs = effortLogs.filter(l => l.loggedAt > weekAgo);
  const completionsByTli: Record<string, number> = {};
  for (const s of balanceStats) completionsByTli[s.tliId] = 0;
  for (const l of recentLogs) {
    if (completionsByTli[l.tliId] !== undefined) completionsByTli[l.tliId]++;
  }
  const incomplete = tasks.filter(t => !t.completedAt);

  return (
    <SafeAreaView style={Common.screen} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Balance</Text>
        <Text style={styles.headerSub}>Target vs. actual effort this week</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        {/* Pie charts */}
        <View style={styles.pieRow}>
          <PieChart data={targetData} title="Target" />
          <PieChart data={actualData} title="Actual (7d)" />
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          {balanceStats.map(s => (
            <View key={s.tliId} style={styles.legendRow}>
              <View style={[styles.dot, { backgroundColor: s.color }]} />
              <Text style={styles.legendLabel}>{s.title}</Text>
            </View>
          ))}
        </View>

        {/* Per-TLI breakdown cards */}
        <Text style={[Common.sectionTitle, { marginBottom: Spacing.sm }]}>Area breakdown</Text>

        {balanceStats.map(stat => {
          const delta = stat.actualShare - stat.targetShare;
          const taskCount = incomplete.filter(t => {
            const walk = (id: string): boolean => {
              if (id === stat.tliId) return true;
              const task = tasks.find(tt => tt.id === id);
              if (!task || !task.parentId) return false;
              return walk(task.parentId);
            };
            return walk(t.id);
          }).length;

          return (
            <View key={stat.tliId} style={styles.statCard}>
              <View style={styles.statHeader}>
                <View style={[styles.dot, { backgroundColor: stat.color }]} />
                <Text style={styles.statTitle}>{stat.title}</Text>
                <Text style={styles.statCount}>{taskCount} tasks</Text>
              </View>

              <View style={styles.statNumbers}>
                {[
                  { label: 'target', value: pct(stat.targetShare), color: Colors.ink },
                  { label: 'actual', value: pct(stat.actualShare),
                    color: Math.abs(delta) < 0.05 ? Colors.teal : delta < 0 ? Colors.amber : Colors.ink },
                  { label: 'delta',  value: `${delta >= 0 ? '+' : ''}${pct(delta)}`,
                    color: Math.abs(delta) < 0.05 ? Colors.teal : delta < 0 ? Colors.amber : Colors.ink },
                ].map(col => (
                  <View key={col.label} style={styles.statNumCol}>
                    <Text style={[styles.statNumVal, { color: col.color }]}>{col.value}</Text>
                    <Text style={styles.statNumLbl}>{col.label}</Text>
                  </View>
                ))}
              </View>

              {/* Dual bar */}
              <View style={styles.dualBarTrack}>
                <View style={[styles.dualBarBg, { width: `${Math.round(stat.targetShare * 100)}%`, backgroundColor: stat.color }]} />
                <View style={[styles.dualBarFg, { width: `${Math.round(stat.actualShare * 100)}%`, backgroundColor: stat.color }]} />
              </View>

              <Text style={styles.statNote}>
                {Math.abs(delta) < 0.03
                  ? '✓ On track'
                  : delta > 0
                    ? `↑ ${pct(Math.abs(delta))} over target`
                    : `↓ ${pct(Math.abs(delta))} below — tasks will be boosted`}
              </Text>
            </View>
          );
        })}

        {/* This week */}
        <View style={Common.cardSecondary}>
          <Text style={[Common.sectionTitle, { marginBottom: Spacing.md }]}>This week</Text>
          {balanceStats.map(s => (
            <View key={s.tliId} style={[Common.row, { marginBottom: Spacing.sm, gap: Spacing.sm }]}>
              <View style={[styles.dot, { backgroundColor: s.color }]} />
              <Text style={[Common.monoText, { flex: 1 }]}>{s.title}</Text>
              <Text style={Common.monoMuted}>{completionsByTli[s.tliId] ?? 0} tasks</Text>
            </View>
          ))}
          <View style={Common.divider} />
          <View style={[Common.row, { justifyContent: 'space-between' }]}>
            <Text style={Common.monoMuted}>Total</Text>
            <Text style={Common.monoText}>{recentLogs.length} tasks</Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
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
  content: {
    padding: Spacing.lg,
    paddingBottom: 40,
    gap: Spacing.lg,
  },
  pieRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  pieCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.paper2,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.rule,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  pieTitle: {
    fontFamily: Fonts.display,
    fontSize: 13,
    color: Colors.ink,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    flexShrink: 0,
  },
  legendLabel: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    color: Colors.ink3,
  },
  statCard: {
    backgroundColor: Colors.paper2,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.rule,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  statTitle: {
    flex: 1,
    fontFamily: Fonts.monoMedium,
    fontSize: 13,
    color: Colors.ink,
  },
  statCount: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    color: Colors.ink4,
  },
  statNumbers: {
    flexDirection: 'row',
    gap: Spacing.xl,
  },
  statNumCol: {
    alignItems: 'center',
    gap: 2,
  },
  statNumVal: {
    fontFamily: Fonts.monoMedium,
    fontSize: 15,
    color: Colors.ink,
  },
  statNumLbl: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    color: Colors.ink4,
  },
  dualBarTrack: {
    height: 6,
    backgroundColor: Colors.rule,
    borderRadius: 3,
    overflow: 'hidden',
  },
  dualBarBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: 6,
    opacity: 0.25,
    borderRadius: 3,
  },
  dualBarFg: {
    position: 'absolute',
    top: 1,
    left: 0,
    height: 4,
    borderRadius: 2,
  },
  statNote: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    color: Colors.ink4,
  },
});
