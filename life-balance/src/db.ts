import Dexie, { type Table } from 'dexie';
import { Task, Place, EffortLog } from './types';

export class LifeBalanceDB extends Dexie {
  tasks!: Table<Task, string>;
  places!: Table<Place, string>;
  effortLogs!: Table<EffortLog, string>;

  constructor() {
    super('LifeBalanceDB');
    this.version(1).stores({
      tasks:      'id, parentId, completedAt, updatedAt',
      places:     'id',
      effortLogs: 'id, taskId, tliId, loggedAt',
    });
  }
}

export const db = new LifeBalanceDB();
