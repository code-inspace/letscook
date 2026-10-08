import { useEffect, useSyncExternalStore } from "react";
import { migrateLegacyStorage } from "./legacyStorage";
import { idbGet, idbSet, isIdbAvailable } from "./idb";

/**
 * Per-user list store with an in-memory snapshot and a persistent backend.
 *
 * - One key per user (`<prefix><userId>`), nothing else is read: no global caches
 *   or key scanning, so data deleted for one user can never be resurrected.
 * - Snapshots are cached by reference, which makes the store usable with
 *   `useSyncExternalStore` (no hydration mismatch, no redundant renders).
 * - An empty list is a valid, persisted state (it is not treated as "missing").
 * - Backends:
 *   - "local": localStorage, read synchronously (small data: outbox, exclusions).
 *   - "idb": IndexedDB, read asynchronously (recipes, plans, shopping list — they
 *     embed base64 images and overflow the ~5 MB localStorage quota on iOS, which
 *     left only the first few recipes cached). The former localStorage copy is
 *     migrated on first load.
 */
export interface UserListStore<T> {
  /** Loaded list, or `null` while the persisted data has not been read yet. */
  peek(userId: string): T[] | null;
  /** Loaded list (empty while not loaded — await `load` first when it matters). */
  read(userId: string): T[];
  load(userId: string): Promise<T[]>;
  write(userId: string, list: T[]): void;
  /**
   * Applies the updater to the loaded list. Synchronous when the list is already
   * in memory (the usual case: the UI is showing it), otherwise after loading.
   */
  update(userId: string, updater: (current: T[]) => T[]): Promise<T[]>;
  subscribe(listener: () => void): () => void;
  /** True when nothing was ever persisted for this user on this device. */
  isEmptyKey(userId: string): boolean;
}

type Backend = "local" | "idb";

const channel =
  typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("letscook-stores") : null;

export function createUserListStore<T>(
  prefix: string,
  legacyEventName?: string,
  backend: Backend = "local"
): UserListStore<T> {
  const cache = new Map<string, T[]>();
  const neverPersisted = new Set<string>();
  const loading = new Map<string, Promise<T[]>>();
  const listeners = new Set<() => void>();
  const useIdb = backend === "idb" && isIdbAvailable();

  const notify = () => {
    listeners.forEach((l) => l());
    if (legacyEventName && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(legacyEventName));
    }
  };

  const readLocalStorage = (userId: string): T[] | null => {
    if (typeof window === "undefined") return null;
    migrateLegacyStorage(userId);
    try {
      const raw = localStorage.getItem(`${prefix}${userId}`);
      const parsed = raw ? JSON.parse(raw) : null;
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  };

  const loadSync = (userId: string): T[] => {
    const list = readLocalStorage(userId);
    if (list === null) neverPersisted.add(userId);
    cache.set(userId, list || []);
    return cache.get(userId)!;
  };

  const persist = (userId: string, list: T[]) => {
    if (typeof window === "undefined") return;
    const key = `${prefix}${userId}`;
    if (useIdb) {
      idbSet(key, list)
        .then(() => {
          // Free the old localStorage copy (it counts against the 5 MB quota)
          try {
            localStorage.removeItem(key);
          } catch {}
          channel?.postMessage({ prefix, userId });
        })
        .catch((err) => console.warn(`IndexedDB write failed for ${prefix}:`, err));
    } else {
      try {
        localStorage.setItem(key, JSON.stringify(list));
      } catch (err) {
        console.warn(`localStorage write failed for ${prefix}:`, err);
      }
    }
  };

  const load = (userId: string): Promise<T[]> => {
    const cached = cache.get(userId);
    if (cached) return Promise.resolve(cached);
    if (!useIdb) return Promise.resolve(loadSync(userId));

    let pending = loading.get(userId);
    if (!pending) {
      pending = (async () => {
        let list: T[] | null = null;
        let fromLegacy = false;
        try {
          const stored = await idbGet<T[]>(`${prefix}${userId}`);
          if (Array.isArray(stored)) list = stored;
        } catch (err) {
          console.warn(`IndexedDB read failed for ${prefix}:`, err);
        }
        if (list === null) {
          list = readLocalStorage(userId);
          fromLegacy = list !== null;
        }
        // A write that happened while we were reading wins
        if (!cache.has(userId)) {
          if (list === null) neverPersisted.add(userId);
          cache.set(userId, list || []);
          if (fromLegacy) persist(userId, list || []);
          notify();
        }
        loading.delete(userId);
        return cache.get(userId)!;
      })();
      loading.set(userId, pending);
    }
    return pending;
  };

  const write = (userId: string, list: T[]) => {
    cache.set(userId, list);
    neverPersisted.delete(userId);
    persist(userId, list);
    notify();
  };

  // Another tab changed this store: drop our copy and reload it
  const invalidate = (userId: string) => {
    cache.delete(userId);
    loading.delete(userId);
    if (useIdb) load(userId);
    else notify();
  };
  const onStorage = (e: StorageEvent) => {
    if (!useIdb && e.key && e.key.startsWith(prefix)) invalidate(e.key.slice(prefix.length));
  };
  const onMessage = (e: MessageEvent) => {
    if (e.data?.prefix === prefix && cache.has(e.data.userId)) invalidate(e.data.userId);
  };

  const peek = (userId: string): T[] | null => {
    const cached = cache.get(userId);
    if (cached) return cached;
    return useIdb ? null : loadSync(userId);
  };

  return {
    peek,
    read: (userId) => peek(userId) || [],
    load,
    write,
    async update(userId, updater) {
      // No await when the list is in memory: the write (and UI update) is synchronous
      if (!peek(userId)) await load(userId);
      const next = updater(cache.get(userId)!);
      write(userId, next);
      return next;
    },
    subscribe(listener) {
      listeners.add(listener);
      if (listeners.size === 1 && typeof window !== "undefined") {
        window.addEventListener("storage", onStorage);
        channel?.addEventListener("message", onMessage);
      }
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0 && typeof window !== "undefined") {
          window.removeEventListener("storage", onStorage);
          channel?.removeEventListener("message", onMessage);
        }
      };
    },
    isEmptyKey(userId) {
      return !cache.has(userId) || neverPersisted.has(userId);
    },
  };
}

/**
 * Subscribes a component to a user list store.
 * Returns `null` during SSR / hydration, while the persisted data is being read
 * and while no user is known, so pages can render a stable skeleton.
 */
export function useUserList<T>(store: UserListStore<T>, userId: string | null | undefined): T[] | null {
  const list = useSyncExternalStore(
    store.subscribe,
    () => (userId ? store.peek(userId) : null),
    () => null
  );
  useEffect(() => {
    if (userId) store.load(userId);
  }, [store, userId]);
  return list;
}
