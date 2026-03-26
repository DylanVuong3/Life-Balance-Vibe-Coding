/**
 * engine.ts — The Life Balance priority algorithm.
 *
 * Priority score = effectiveImportance × neglectMultiplier × deadlineMultiplier
 *
 * effectiveImportance: task.importance multiplied down the ancestor chain,
 *   then scaled by the TLI's share of total importance.
 *
 * neglectMultiplier [1×–3×]: how far behind this TLI's actual effort share
 *   is vs. its target share over the last 7 days.
 *
 * deadlineMultiplier [1×–5×]: exponential urgency as deadline approaches;
 *   overdue tasks get the maximum multiplier.
 */

import { Task, EffortLog, ScoredTask, BalanceStat, EffortSize } from './types';

// ─── Effort unit mapping ───────────────────────────────────────────────────────

export const EFFORT_UNITS: Record<EffortSize, number> = {
  tiny:   0.25,
  small:  0.5,
  medium: 1.0,
  large:  2.0,
  huge:   4.0,
};

export function getEffortUnits(size: EffortSize): number {
  return EFFORT_UNITS[size];
}

// ─── Tree helpers ──────────────────────────────────────────────────────────────

/** Walk up the ancestor chain to find the top-level item ID. */
export function getTliId(task: Task, allTasks: Task[]): string | null {
  if (task.parentId === null) return task.id;
  const parent = allTasks.find(t => t.id === task.parentId);
  if (!parent) return null;
  return getTliId(parent, allTasks);
}

export function getDepth(task: Task, allTasks: Task[]): number {
  if (task.parentId === null) return 0;
  const parent = allTasks.find(t => t.id === task.parentId);
  if (!parent) return 0;
  return getDepth(parent, allTasks) + 1;
}

export function isLeaf(task: Task, allTasks: Task[]): boolean {
  return !allTasks.some(t => t.parentId === task.id && !t.completedAt);
}

export function getChildren(parentId: string | null, allTasks: Task[]): Task[] {
  return allTasks.filter(t => t.parentId === parentId && !t.completedAt);
}

export function getDescendantIds(taskId: string, allTasks: Task[]): string[] {
  const children = allTasks.filter(t => t.parentId === taskId);
  return children.flatMap(c => [c.id, ...getDescendantIds(c.id, allTasks)]);
}

/**
 * Multiply importance down the ancestor chain.
 * A task of 0.8 importance under a TLI of 0.6 importance
 * has effective importance 0.48.
 */
function getEffectiveImportance(task: Task, allTasks: Task[]): number {
  if (task.parentId === null) return task.importance;
  const parent = allTasks.find(t => t.id === task.parentId);
  if (!parent) return task.importance;
  return getEffectiveImportance(parent, allTasks) * task.importance;
}

// ─── Multiplier functions ──────────────────────────────────────────────────────

function getDeadlineMultiplier(deadline?: string): number {
  if (!deadline) return 1;
  const daysUntil = (new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  if (daysUntil < 0) return 5;                        // overdue: maximum urgency
  if (daysUntil > 30) return 1;                       // distant: no effect
  return 1 + Math.exp(-daysUntil / 7) * 4;           // exponential ramp
}

function getNeglectMultiplier(targetShare: number, actualShare: number): number {
  if (targetShare <= 0) return 1;
  const neglect = Math.max(0, (targetShare - actualShare) / targetShare);
  return 1 + neglect * 2;                             // range: 1×–3×
}

// ─── TLI color palette ─────────────────────────────────────────────────────────

export const TLI_COLORS = [
  '#7F77DD', // purple
  '#1D9E75', // teal
  '#D85A30', // coral
  '#BA7517', // amber
  '#378ADD', // blue
  '#639922', // green
  '#D4537E', // pink
];

export function assignTliColors(tlis: Task[]): Record<string, string> {
  const map: Record<string, string> = {};
  tlis.forEach((tli, i) => {
    map[tli.id] = TLI_COLORS[i % TLI_COLORS.length];
  });
  return map;
}

// ─── Main algorithm ────────────────────────────────────────────────────────────

export function computePriorityQueue(
  tasks: Task[],
  effortLogs: EffortLog[],
  activePlaceIds: string[],
): ScoredTask[] {
  const incomplete = tasks.filter(t => !t.completedAt);
  const tlis = incomplete.filter(t => t.parentId === null);

  if (tlis.length === 0) return [];

  const colorMap = assignTliColors(tlis);
  const totalTliImp = tlis.reduce((s, t) => s + t.importance, 0) || 1;

  // Effort logged in the last 7 days, bucketed by TLI
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const recentLogs = effortLogs.filter(l => l.loggedAt > weekAgo);
  const effortByTli: Record<string, number> = {};
  for (const tli of tlis) effortByTli[tli.id] = 0;
  for (const log of recentLogs) {
    if (effortByTli[log.tliId] !== undefined) {
      effortByTli[log.tliId] += log.units;
    }
  }
  const totalEffort = Math.max(1, Object.values(effortByTli).reduce((a, b) => a + b, 0));

  // Only leaf tasks (no incomplete children) appear in the queue
  const leaves = incomplete.filter(t => isLeaf(t, incomplete));

  return leaves
    .map((task): ScoredTask | null => {
      const tliId = getTliId(task, incomplete);
      if (!tliId) return null;
      const tli = tlis.find(t => t.id === tliId);
      if (!tli) return null;

      // Apply place filter when places are active
      if (activePlaceIds.length > 0 && task.placeIds.length > 0) {
        const hasMatch = task.placeIds.some(pid => activePlaceIds.includes(pid));
        if (!hasMatch) return null;
      }

      const effImp = getEffectiveImportance(task, incomplete);
      const targetShare = tli.importance / totalTliImp;
      const actualShare = effortByTli[tliId] / totalEffort;
      const neglectM = getNeglectMultiplier(targetShare, actualShare);
      const deadlineM = getDeadlineMultiplier(task.deadline);
      const score = effImp * neglectM * deadlineM;

      return {
        ...task,
        score,
        tliId,
        tliTitle: tli.title,
        tliColor: colorMap[tliId] ?? '#888',
        depth: getDepth(task, incomplete),
        effectiveImportance: effImp,
        neglectMultiplier: neglectM,
        deadlineMultiplier: deadlineM,
      };
    })
    .filter((t): t is ScoredTask => t !== null)
    .sort((a, b) => b.score - a.score);
}

export function computeBalanceStats(
  tasks: Task[],
  effortLogs: EffortLog[],
): BalanceStat[] {
  const incomplete = tasks.filter(t => !t.completedAt);
  const tlis = incomplete.filter(t => t.parentId === null);
  const colorMap = assignTliColors(tlis);

  const totalTliImp = tlis.reduce((s, t) => s + t.importance, 0) || 1;
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const recentLogs = effortLogs.filter(l => l.loggedAt > weekAgo);
  const effortByTli: Record<string, number> = {};
  for (const tli of tlis) effortByTli[tli.id] = 0;
  for (const log of recentLogs) {
    if (effortByTli[log.tliId] !== undefined) {
      effortByTli[log.tliId] += log.units;
    }
  }
  const totalEffort = Math.max(1, Object.values(effortByTli).reduce((a, b) => a + b, 0));

  return tlis.map(tli => ({
    tliId: tli.id,
    title: tli.title,
    color: colorMap[tli.id] ?? '#888',
    importance: tli.importance,
    targetShare: tli.importance / totalTliImp,
    actualShare: effortByTli[tli.id] / totalEffort,
  }));
}
