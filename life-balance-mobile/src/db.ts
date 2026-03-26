import { openDatabaseAsync, SQLiteDatabase } from 'expo-sqlite';
import { Task, Place, EffortLog } from './types';

let _db: SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLiteDatabase> {
  if (_db) return _db;
  _db = await openDatabaseAsync('lifebalance.db');
  await migrate(_db);
  return _db;
}

// ─── Schema ────────────────────────────────────────────────────────────────────

async function migrate(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS tasks (
      id          TEXT PRIMARY KEY,
      parentId    TEXT,
      title       TEXT NOT NULL,
      notes       TEXT NOT NULL DEFAULT '',
      importance  REAL NOT NULL DEFAULT 0.5,
      effortSize  TEXT NOT NULL DEFAULT 'small',
      repeating   INTEGER NOT NULL DEFAULT 0,
      repeatDays  INTEGER,
      deadline    TEXT,
      completedAt TEXT,
      placeIds    TEXT NOT NULL DEFAULT '[]',
      createdAt   TEXT NOT NULL,
      updatedAt   TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS places (
      id       TEXT PRIMARY KEY,
      name     TEXT NOT NULL,
      color    TEXT NOT NULL,
      isOpen   INTEGER NOT NULL DEFAULT 1,
      schedule TEXT
    );

    CREATE TABLE IF NOT EXISTS effort_logs (
      id        TEXT PRIMARY KEY,
      taskId    TEXT NOT NULL,
      tliId     TEXT NOT NULL,
      units     REAL NOT NULL,
      loggedAt  TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_parentId    ON tasks(parentId);
    CREATE INDEX IF NOT EXISTS idx_tasks_completedAt ON tasks(completedAt);
    CREATE INDEX IF NOT EXISTS idx_logs_tliId        ON effort_logs(tliId);
    CREATE INDEX IF NOT EXISTS idx_logs_loggedAt     ON effort_logs(loggedAt);
  `);
}

// ─── Serialization ─────────────────────────────────────────────────────────────

function serializeTask(t: Task): Record<string, unknown> {
  return {
    ...t,
    placeIds:    JSON.stringify(t.placeIds),
    repeating:   t.repeating ? 1 : 0,
    deadline:    t.deadline    ?? null,
    completedAt: t.completedAt ?? null,
    repeatDays:  t.repeatDays  ?? null,
    parentId:    t.parentId    ?? null,
  };
}

function deserializeTask(row: Record<string, unknown>): Task {
  return {
    id:          row.id as string,
    parentId:    row.parentId as string | null,
    title:       row.title as string,
    notes:       (row.notes as string) ?? '',
    importance:  row.importance as number,
    effortSize:  row.effortSize as Task['effortSize'],
    repeating:   row.repeating === 1,
    repeatDays:  row.repeatDays as number | undefined,
    deadline:    row.deadline as string | undefined,
    completedAt: row.completedAt as string | undefined,
    placeIds:    JSON.parse((row.placeIds as string) || '[]'),
    createdAt:   row.createdAt as string,
    updatedAt:   row.updatedAt as string,
  };
}

function deserializePlace(row: Record<string, unknown>): Place {
  return {
    id:       row.id as string,
    name:     row.name as string,
    color:    row.color as string,
    isOpen:   row.isOpen === 1,
    schedule: row.schedule ? JSON.parse(row.schedule as string) : undefined,
  };
}

function deserializeLog(row: Record<string, unknown>): EffortLog {
  return {
    id:       row.id as string,
    taskId:   row.taskId as string,
    tliId:    row.tliId as string,
    units:    row.units as number,
    loggedAt: row.loggedAt as string,
  };
}

// ─── Tasks ─────────────────────────────────────────────────────────────────────

export async function dbGetAllTasks(): Promise<Task[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Record<string, unknown>>('SELECT * FROM tasks');
  return rows.map(deserializeTask);
}

export async function dbAddTask(task: Task): Promise<void> {
  const db = await getDb();
  const s = serializeTask(task);
  await db.runAsync(
    `INSERT INTO tasks (id,parentId,title,notes,importance,effortSize,repeating,repeatDays,deadline,completedAt,placeIds,createdAt,updatedAt)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [s.id, s.parentId, s.title, s.notes, s.importance, s.effortSize, s.repeating, s.repeatDays, s.deadline, s.completedAt, s.placeIds, s.createdAt, s.updatedAt]
  );
}

export async function dbUpdateTask(id: string, updates: Partial<Task>): Promise<void> {
  const db = await getDb();
  const entries = Object.entries(updates);
  if (entries.length === 0) return;
  const fields = entries.map(([k]) => `${k} = ?`).join(', ');
  const values = entries.map(([k, v]) => {
    if (k === 'placeIds') return JSON.stringify(v);
    if (k === 'repeating') return v ? 1 : 0;
    if (v === undefined) return null;
    return v;
  });
  await db.runAsync(`UPDATE tasks SET ${fields} WHERE id = ?`, [...values, id]);
}

export async function dbDeleteTasks(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const db = await getDb();
  const placeholders = ids.map(() => '?').join(',');
  await db.runAsync(`DELETE FROM tasks WHERE id IN (${placeholders})`, ids);
}

// ─── Places ────────────────────────────────────────────────────────────────────

export async function dbGetAllPlaces(): Promise<Place[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Record<string, unknown>>('SELECT * FROM places');
  return rows.map(deserializePlace);
}

export async function dbAddPlace(place: Place): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO places (id,name,color,isOpen,schedule) VALUES (?,?,?,?,?)`,
    [place.id, place.name, place.color, place.isOpen ? 1 : 0, place.schedule ? JSON.stringify(place.schedule) : null]
  );
}

export async function dbUpdatePlace(id: string, updates: Partial<Place>): Promise<void> {
  const db = await getDb();
  const entries = Object.entries(updates);
  if (entries.length === 0) return;
  const fields = entries.map(([k]) => `${k} = ?`).join(', ');
  const values = entries.map(([k, v]) => {
    if (k === 'isOpen') return v ? 1 : 0;
    if (k === 'schedule') return v ? JSON.stringify(v) : null;
    return v ?? null;
  });
  await db.runAsync(`UPDATE places SET ${fields} WHERE id = ?`, [...values, id]);
}

export async function dbDeletePlace(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM places WHERE id = ?', [id]);
}

// ─── Effort logs ───────────────────────────────────────────────────────────────

export async function dbGetAllLogs(): Promise<EffortLog[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Record<string, unknown>>('SELECT * FROM effort_logs');
  return rows.map(deserializeLog);
}

export async function dbAddLog(log: EffortLog): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO effort_logs (id,taskId,tliId,units,loggedAt) VALUES (?,?,?,?,?)`,
    [log.id, log.taskId, log.tliId, log.units, log.loggedAt]
  );
}

// ─── Seed guard ────────────────────────────────────────────────────────────────

export async function dbIsEmpty(): Promise<boolean> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM tasks');
  return (row?.count ?? 0) === 0;
}
