// ─── Core domain types ────────────────────────────────────────────────────────

export type EffortSize = 'tiny' | 'small' | 'medium' | 'large' | 'huge';

export interface Task {
  id: string;
  parentId: string | null;
  title: string;
  notes: string;
  importance: number;
  effortSize: EffortSize;
  repeating: boolean;
  repeatDays?: number;
  deadline?: string;
  completedAt?: string;
  placeIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Place {
  id: string;
  name: string;
  color: string;
  isOpen: boolean;
  schedule?: {
    days: number[];
    startHour: number;
    endHour: number;
  };
}

export interface EffortLog {
  id: string;
  taskId: string;
  tliId: string;
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

export type ViewMode = 'queue' | 'tree' | 'balance';
