/**
 * Minimal promise wrapper around one IndexedDB object store used as a key/value cache.
 *
 * IndexedDB is used instead of localStorage for app data because iOS caps
 * localStorage at ~5 MB: recipes embed base64 images, so only the first few
 * recipes fit and every later write failed.
 */
const DB_NAME = "letscook";
const STORE = "kv";

let dbPromise: Promise<IDBDatabase> | null = null;

export function isIdbAvailable(): boolean {
  return typeof indexedDB !== "undefined";
}

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => {
        const db = req.result;
        // Another tab upgraded the DB: drop this connection, reopen lazily
        db.onversionchange = () => {
          db.close();
          dbPromise = null;
        };
        resolve(db);
      };
      req.onerror = () => {
        dbPromise = null;
        reject(req.error);
      };
    });
  }
  return dbPromise;
}

function run<R>(mode: IDBTransactionMode, op: (store: IDBObjectStore) => IDBRequest<R>): Promise<R> {
  return openDb().then(
    (db) =>
      new Promise<R>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const req = op(tx.objectStore(STORE));
        tx.oncomplete = () => resolve(req.result);
        tx.onerror = () => reject(tx.error || req.error);
        tx.onabort = () => reject(tx.error || new Error("IndexedDB transaction aborted"));
      })
  );
}

export function idbGet<T>(key: string): Promise<T | undefined> {
  return run("readonly", (s) => s.get(key) as IDBRequest<T | undefined>);
}

export function idbSet(key: string, value: unknown): Promise<void> {
  return run("readwrite", (s) => s.put(value, key)).then(() => undefined);
}
