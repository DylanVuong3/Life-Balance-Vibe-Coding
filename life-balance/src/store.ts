import { create } from 'zustand';
import { v4 as uuid } from 'uuid';
import { Task, Place, EffortLog, ScoredTask, BalanceStat, ViewMode } from './types';
import { db } from './db';
import {
  computePriorityQueue,
  computeBalanceStats,
  getTliId,
  getEffortUnits,
  getDescendantIds,
} from './engine';

// ─── State shape ───────────────────────────────────────────────────────────────

interface AppState {
  // Persisted data
  tasks: Task[];
  places: Place[];
  effortLogs: EffortLog[];

  // UI state
  activePlaceIds: string[];
  selectedTaskId: string | null;
  view: ViewMode;
  isDetailOpen: boolean;

  // Derived (recomputed on every mutation)
  queue: ScoredTask[];
  balanceStats: BalanceStat[];

  // ─── Actions ────────────────────────────────────────────────────────────────
  loadAll: () => Promise<void>;

  // Tasks
  addTask: (data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  completeTask: (id: string) => Promise<void>;
  reopenTask: (id: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;

  // Places
  addPlace: (data: Omit<Place, 'id'>) => Promise<string>;
  updatePlace: (id: string, updates: Partial<Place>) => Promise<void>;
  deletePlace: (id: string) => Promise<void>;

  // Effort
  logEffort: (taskId: string, tliId: string, units: number) => Promise<void>;

  // UI
  setActivePlaces: (ids: string[]) => void;
  selectTask: (id: string | null) => void;
  setView: (view: ViewMode) => void;
}

// ─── Helper: recompute derived state ─────────────────────────────────────────

function derive(
  tasks: Task[],
  effortLogs: EffortLog[],
  activePlaceIds: string[],
): Pick<AppState, 'queue' | 'balanceStats'> {
  return {
    queue: computePriorityQueue(tasks, effortLogs, activePlaceIds),
    balanceStats: computeBalanceStats(tasks, effortLogs),
  };
}

// ─── Store ─────────────────────────────────────────────────────────────────────

export const useStore = create<AppState>((set, get) => ({
  tasks: [],
  places: [],
  effortLogs: [],
  activePlaceIds: [],
  selectedTaskId: null,
  view: 'queue',
  isDetailOpen: false,
  queue: [],
  balanceStats: [],

  // ─── Load ──────────────────────────────────────────────────────────────────

  loadAll: async () => {
    const [tasks, places, effortLogs] = await Promise.all([
      db.tasks.toArray(),
      db.places.toArray(),
      db.effortLogs.toArray(),
    ]);
    const { activePlaceIds } = get();
    set({ tasks, places, effortLogs, ...derive(tasks, effortLogs, activePlaceIds) });
  },

  // ─── Task actions ──────────────────────────────────────────────────────────

  addTask: async (data) => {
    const now = new Date().toISOString();
    const task: Task = { ...data, id: uuid(), createdAt: now, updatedAt: now };
    await db.tasks.add(task);
    const tasks = [...get().tasks, task];
    const { effortLogs, activePlaceIds } = get();
    set({ tasks, ...derive(tasks, effortLogs, activePlaceIds) });
    return task.id;
  },

  updateTask: async (id, updates) => {
    const patch = { ...updates, updatedAt: new Date().toISOString() };
    await db.tasks.update(id, patch);
    const tasks = get().tasks.map(t => t.id === id ? { ...t, ...patch } : t);
    const { effortLogs, activePlaceIds } = get();
    set({ tasks, ...derive(tasks, effortLogs, activePlaceIds) });
  },

  completeTask: async (id) => {
    const completedAt = new Date().toISOString();
    await db.tasks.update(id, { completedAt, updatedAt: completedAt });
    const tasks = get().tasks.map(t =>
      t.id === id ? { ...t, completedAt, updatedAt: completedAt } : t
    );

    // Log effort so the balance algorithm knows work happened
    const task = get().tasks.find(t => t.id === id);
    let effortLogs = get().effortLogs;
    if (task) {
      const tliId = getTliId(task, get().tasks);
      if (tliId) {
        const log: EffortLog = {
          id: uuid(),
          taskId: id,
          tliId,
          units: getEffortUnits(task.effortSize),
          loggedAt: completedAt,
        };
        await db.effortLogs.add(log);
        effortLogs = [...effortLogs, log];
      }
    }

    const { activePlaceIds } = get();
    set({ tasks, effortLogs, ...derive(tasks, effortLogs, activePlaceIds) });
  },

  reopenTask: async (id) => {
    await db.tasks.update(id, { completedAt: undefined, updatedAt: new Date().toISOString() });
    const tasks = get().tasks.map(t =>
      t.id === id ? { ...t, completedAt: undefined, updatedAt: new Date().toISOString() } : t
    );
    const { effortLogs, activePlaceIds } = get();
    set({ tasks, ...derive(tasks, effortLogs, activePlaceIds) });
  },

  deleteTask: async (id) => {
    // Recursively delete all descendants
    const allTasks = get().tasks;
    const toDelete = [id, ...getDescendantIds(id, allTasks)];
    await db.tasks.bulkDelete(toDelete);
    const tasks = allTasks.filter(t => !toDelete.includes(t.id));
    const { effortLogs, activePlaceIds } = get();
    const selectedTaskId = toDelete.includes(get().selectedTaskId ?? '') ? null : get().selectedTaskId;
    set({ tasks, selectedTaskId, ...derive(tasks, effortLogs, activePlaceIds) });
  },

  // ─── Place actions ─────────────────────────────────────────────────────────

  addPlace: async (data) => {
    const place: Place = { ...data, id: uuid() };
    await db.places.add(place);
    set({ places: [...get().places, place] });
    return place.id;
  },

  updatePlace: async (id, updates) => {
    await db.places.update(id, updates);
    set({ places: get().places.map(p => p.id === id ? { ...p, ...updates } : p) });
  },

  deletePlace: async (id) => {
    await db.places.delete(id);
    set({ places: get().places.filter(p => p.id !== id) });
  },

  // ─── Effort ────────────────────────────────────────────────────────────────

  logEffort: async (taskId, tliId, units) => {
    const log: EffortLog = { id: uuid(), taskId, tliId, units, loggedAt: new Date().toISOString() };
    await db.effortLogs.add(log);
    const effortLogs = [...get().effortLogs, log];
    const { tasks, activePlaceIds } = get();
    set({ effortLogs, ...derive(tasks, effortLogs, activePlaceIds) });
  },

  // ─── UI ────────────────────────────────────────────────────────────────────

  setActivePlaces: (ids) => {
    const { tasks, effortLogs } = get();
    set({ activePlaceIds: ids, ...derive(tasks, effortLogs, ids) });
  },

  selectTask: (id) => set({ selectedTaskId: id, isDetailOpen: id !== null }),

  setView: (view) => set({ view }),
}));
