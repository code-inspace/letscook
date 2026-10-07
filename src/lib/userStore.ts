import { useSyncExternalStore } from "react";
import { migrateLegacyStorage } from "./legacyStorage";

/**
 * Per-user list store backed by localStorage.
 *
 * - One localStorage key per user (`<prefix><userId>`), nothing else is read: no
 *   global caches or key scanning, so data deleted for one user can never be
 *   resurrected from another key.
 * - Snapshots are cached by reference, which makes the store usable with
 *   `useSyncExternalStore` (no hydration mismatch, no redundant renders).
 * - An empty list is a valid, persisted state (it is not treated as "missing").
 */
export interface UserListStore<T> {
  read(userId: string): T[];
  write(userId: string, list: T[]): void;
  update(userId: string, updater: (current: T[]) => T[]): T[];
  subscribe(listener: () => void): () => void;
  /** True when this user has never had data persisted under the store key. */
  isEmptyKey(userId: string): boolean;
}

export function createUserListStore<T>(prefix: string, legacyEventName?: string): UserListStore<T> {
  const cache = new Map<string, T[]>();
  const listeners = new Set<() => void>();

  const notify = () => {
    listeners.forEach((l) => l());
    if (legacyEventName && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(legacyEventName));
    }
  };

  const read = (userId: string): T[] => {
    const cached = cache.get(userId);
    if (cached) return cached;
    let list: T[] = [];
    if (typeof window !== "undefined") {
      migrateLegacyStorage(userId);
      try {
        const raw = localStorage.getItem(`${prefix}${userId}`);
        const parsed = raw ? JSON.parse(raw) : null;
        if (Array.isArray(parsed)) list = parsed;
      } catch {}
    }
    cache.set(userId, list);
    return list;
  };

  const write = (userId: string, list: T[]) => {
    cache.set(userId, list);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(`${prefix}${userId}`, JSON.stringify(list));
      } catch (err) {
        console.warn(`localStorage write failed for ${prefix}:`, err);
      }
    }
    notify();
  };

  const onStorage = (e: StorageEvent) => {
    // Another tab changed this store: drop our cached copy and re-render
    if (e.key && e.key.startsWith(prefix)) {
      cache.delete(e.key.slice(prefix.length));
      listeners.forEach((l) => l());
    }
  };

  return {
    read,
    write,
    update(userId, updater) {
      const next = updater(read(userId));
      write(userId, next);
      return next;
    },
    subscribe(listener) {
      listeners.add(listener);
      if (listeners.size === 1 && typeof window !== "undefined") {
        window.addEventListener("storage", onStorage);
      }
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0 && typeof window !== "undefined") {
          window.removeEventListener("storage", onStorage);
        }
      };
    },
    isEmptyKey(userId) {
      if (typeof window === "undefined") return true;
      try {
        return localStorage.getItem(`${prefix}${userId}`) === null;
      } catch {
        return true;
      }
    },
  };
}

/**
 * Subscribes a component to a user list store.
 * Returns `null` during SSR / hydration and while no user is known, so pages can
 * render a stable skeleton on the server and the cached data right after hydration.
 */
export function useUserList<T>(store: UserListStore<T>, userId: string | null | undefined): T[] | null {
  return useSyncExternalStore(
    store.subscribe,
    () => (userId ? store.read(userId) : null),
    () => null
  );
}
