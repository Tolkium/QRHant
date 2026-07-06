/** Minimal promise wrapper over IndexedDB — the mock backend's storage. */

const DB_NAME = 'qrhunt';
const DB_VERSION = 1;

export const STORES = [
  'kv',
  'users',
  'events',
  'codes',
  'finds',
  'anomalies',
  'localFinds',
] as const;
export type StoreName = (typeof STORES)[number];

let dbPromise: Promise<IDBDatabase> | null = null;

export function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const name of STORES) {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name);
        }
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx<T>(
  store: StoreName,
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode);
        const req = fn(t.objectStore(store));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

export function idbGet<T>(store: StoreName, key: string): Promise<T | undefined> {
  return tx<T | undefined>(store, 'readonly', (s) => s.get(key) as IDBRequest<T | undefined>);
}

export function idbGetAll<T>(store: StoreName): Promise<T[]> {
  return tx<T[]>(store, 'readonly', (s) => s.getAll() as IDBRequest<T[]>);
}

export function idbPut<T>(store: StoreName, key: string, value: T): Promise<IDBValidKey> {
  return tx(store, 'readwrite', (s) => s.put(value, key));
}

export function idbDelete(store: StoreName, key: string): Promise<undefined> {
  return tx(store, 'readwrite', (s) => s.delete(key));
}

export function idbClear(store: StoreName): Promise<undefined> {
  return tx(store, 'readwrite', (s) => s.clear());
}
