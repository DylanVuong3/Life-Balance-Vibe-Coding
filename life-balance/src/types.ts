// ─── Core domain types ────────────────────────────────────────────────────────

export type EffortSize = 'tiny' | 'small' | 'medium' | 'large' | 'huge';

/**
 * Every item in the system — from a lifetime goal to "take out the trash" —
 * is a Task. The tree is expressed via parentId references.
 * Top-level items (TLIs) have parentId === null.
 */
export interface Task {
  id: string;
  parentId: string | null;
  title: string;
  notes: string;
  /** 0–1, relative to siblings. TLI importance is absolute weight. */
  importance: number;
  effortSize: EffortSize;
  /** If true, task reappears after completion based on repeatDays */
  repeating: boolean;
  repeatDays?: number;
  /** ISO date string */
  deadline?: string;
  /** ISO date string — set when checked off */
  completedAt?: string;
  /** IDs of places where this task can be done */
  placeIds: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * A place is a context filter — can be physical or conceptual.
 * "Not Working", "Client Site", "Home" are all valid places.
 */
export interface Place {
  id: string;
  name: string;
  color: string;
  /** Whether this place is currently active (open) */
  isOpen: boolean;
  /** Optional time-based schedule */
  schedule?: {
    days: number[];       // 0=Sun … 6=Sat
    startHour: number;
    endHour: number;
  };
}

/**
 * Every time a task is completed, effort is logged against its TLI.
 * This is the memory of the balance algorithm — without it, neglect
 * can't be detected.
 */
export interface EffortLog {
  id: string;
  taskId: string;
  /** ID of the top-level item this task belongs to */
  tliId: string;
  /** Numeric effort units derived from the task's effortSize */
  units: number;
  loggedAt: string;
}

// ─── Derived / computed types ──────────────────────────────────────────────────

export interface ScoredTask extends Task {
  score: number;
  tliId: string;
  tliTitle: string;
  tliColor: string;
  depth: number;
  effectiveImportance: number;
  neglectMultiplier: number;
  deadlineMultiplier: number;
}

export interface BalanceStat {
  tliId: string;
  title: string;
  color: string;
  importance: number;
  targetShare: number;
  actualShare: number;
}

// ─── UI state ─────────────────────────────────────────────────────────────────

export type ViewMode = 'queue' | 'tree' | 'balance';
