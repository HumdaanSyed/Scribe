import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Meeting } from '@/lib/transcript/model';

interface ScribeDB extends DBSchema {
  meetings: {
    key: string;
    value: Meeting;
    indexes: { 'by-createdAt': number };
  };
}

const DB_NAME = 'scribe';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<ScribeDB>> | null = null;

/** Opens (and caches) the single IndexedDB database — one `meetings` object store, keyed by id. */
export function getDB(): Promise<IDBPDatabase<ScribeDB>> {
  if (!dbPromise) {
    dbPromise = openDB<ScribeDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore('meetings', { keyPath: 'id' });
        store.createIndex('by-createdAt', 'createdAt');
      },
    });
  }
  return dbPromise;
}
