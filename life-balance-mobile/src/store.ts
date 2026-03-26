import { create } from 'zustand';
import { uuid } from './uuid';
import { Task, Place, EffortLog, ScoredTask, BalanceStat } from './types';
import {
  dbGetAllTasks, dbAddTask, dbUpdateTask, dbDeleteTasks,
  dbGetAllPlaces, dbAddPlace, dbUpdatePlace, dbDeletePlace,
  dbGetAllLogs, dbAddLog,
} from './db';
import {
  computePriorityQueue,
  computeBalanceStats,
  getTliId,
  getEffortUnits,
  getDescendantIds,
} from './engine';

// ─── State ─────────────────────────────────────────────────────────────────────

interface AppState {
  tasks: Task[];
  places: Place[];
  effortLogs: EffortLog[];

  activePlaceIds: string[];
  selectedTaskId: string | null;

  queue: ScoredTask[];
  balanceStats: BalanceStat[];

  loadAll: () => Promise<void>;

  addTask: (data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  completeTask: (id: string) => Promise<void>;
  reopenTask: (id: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;

  addPlace: (data: Omit<Place, 'id'>) => Promise<string>;
  updatePlace: (id: string, updates: Partial<Place>) => Promise<void>;
  deletePlace: (id: string) => Promise<void>;

  logEffort: (taskId: string, tliId: string, units: number) => Promise<void>;

  setActivePlaces: (ids: string[]) => void;
  selectTask: (id: string | null) => void;
}

function derive(
  tasks: Task[],
  effortLogs: EffortLog[],
  activePlaceIds: string[],
) {
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
  queue: [],
  balanceStats: [],

  loadAll: async () => {
    const [tasks, places, effortLogs] = await Promise.all([
      dbGetAllTasks(),
      dbGetAllPlaces(),
      dbGetAllLogs(),
    ]);
    const { activePlaceIds } = get();
    set({ tasks, places, effortLogs, ...derive(tasks, effortLogs, activePlaceIds) });
  },

  addTask: async (data) => {
    const now = new Date().toISOString();
    const task: Task = { ...data, id: uuid(), createdAt: now, updatedAt: now };
    await dbAddTask(task);
    const tasks = [...get().tasks, task];
    const { effortLogs, activePlaceIds } = get();
    set({ tasks, ...derive(tasks, effortLogs, activePlaceIds) });
    return task.id;
  },

  updateTask: async (id, updates) => {
    const patch = { ...updates, updatedAt: new Date().toISOString() };
    await dbUpdateTask(id, patch);
    const tasks = get().tasks.map(t => t.id === id ? { ...t, ...patch } : t);
    const { effortLogs, activePlaceIds } = get();
    set({ tasks, ...derive(tasks, effortLogs, activePlaceIds) });
  },

  completeTask: async (id) => {
    const completedAt = new Date().toISOString();
    await dbUpdateTask(id, { completedAt, updatedAt: completedAt });
    const tasks = get().tasks.map(t =>
      t.id === id ? { ...t, completedAt, updatedAt: completedAt } : t
    );

    const task = get().tasks.find(t => t.id === id);
    let effortLogs = get().effortLogs;
    if (task) {
      const tliId = getTliId(task, get().tasks);
      if (tliId) {
        const log: EffortLog = {
          id: uuid(), taskId: id, tliId,
          units: getEffortUnits(task.effortSize),
          loggedAt: completedAt,
        };
        await dbAddLog(log);
        effortLogs = [...effortLogs, log];
      }
    }

    const { activePlaceIds } = get();
    set({ tasks, effortLogs, ...derive(tasks, effortLogs, activePlaceIds) });
  },

  reopenTask: async (id) => {
    const updatedAt = new Date().toISOString();
    await dbUpdateTask(id, { completedAt: undefined, updatedAt });
    const tasks = get().tasks.map(t =>
      t.id === id ? { ...t, completedAt: undefined, updatedAt } : t
    );
    const { effortLogs, activePlaceIds } = get();
    set({ tasks, ...derive(tasks, effortLogs, activePlaceIds) });
  },

  deleteTask: async (id) => {
    const allTasks = get().tasks;
    const toDelete = [id, ...getDescendantIds(id, allTasks)];
    await dbDeleteTasks(toDelete);
    const tasks = allTasks.filter(t => !toDelete.includes(t.id));
    const { effortLogs, activePlaceIds } = get();
    const selectedTaskId = toDelete.includes(get().selectedTaskId ?? '') ? null : get().selectedTaskId;
    set({ tasks, selectedTaskId, ...derive(tasks, effortLogs, activePlaceIds) });
  },

  addPlace: async (data) => {
    const place: Place = { ...data, id: uuid() };
    await dbAddPlace(place);
    set({ places: [...get().places, place] });
    return place.id;
  },

  updatePlace: async (id, updates) => {
    await dbUpdatePlace(id, updates);
    set({ places: get().places.map(p => p.id === id ? { ...p, ...updates } : p) });
  },

  deletePlace: async (id) => {
    await dbDeletePlace(id);
    set({ places: get().places.filter(p => p.id !== id) });
  },

  logEffort: async (taskId, tliId, units) => {
    const log: EffortLog = { id: uuid(), taskId, tliId, units, loggedAt: new Date().toISOString() };
    await dbAddLog(log);
    const effortLogs = [...get().effortLogs, log];
    const { tasks, activePlaceIds } = get();
    set({ effortLogs, ...derive(tasks, effortLogs, activePlaceIds) });
  },

  setActivePlaces: (ids) => {
    const { tasks, effortLogs } = get();
    set({ activePlaceIds: ids, ...derive(tasks, effortLogs, ids) });
  },

  selectTask: (id) => set({ selectedTaskId: id }),
}));
