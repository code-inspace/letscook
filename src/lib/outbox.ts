import { createUserListStore } from "./userStore";

/**
 * Pending remote writes that failed (offline, network error, Supabase error).
 *
 * Local stores are updated immediately; when the matching Supabase write fails,
 * an entry is queued here so that:
 * - a later remote refresh does not erase the unsynced local change, and
 * - the next sync retries exactly that write (instead of blindly re-uploading
 *   every local row, which used to resurrect deleted data and overwrite edits
 *   made on other devices).
 */
export type OutboxKind = "recipe" | "mealPlan" | "shopping";

export interface OutboxEntry {
  kind: OutboxKind;
  op: "upsert" | "delete";
  id: string;
  /** Identifies one write attempt, so an older request never dequeues a newer one. */
  seq?: string;
}

const outboxStore = createUserListStore<OutboxEntry>("letscook_outbox_");

export function getOutbox(userId: string): OutboxEntry[] {
  return outboxStore.read(userId);
}

export function enqueue(userId: string, entry: OutboxEntry): void {
  outboxStore.update(userId, (list) => [
    ...list.filter((e) => !(e.kind === entry.kind && e.id === entry.id)),
    entry,
  ]);
}

export function dequeue(userId: string, kind: OutboxKind, id: string): void {
  const list = outboxStore.read(userId);
  if (!list.some((e) => e.kind === kind && e.id === id)) return;
  outboxStore.write(
    userId,
    list.filter((e) => !(e.kind === kind && e.id === id))
  );
}

export function pendingFor(userId: string, kind: OutboxKind) {
  const entries = outboxStore.read(userId).filter((e) => e.kind === kind);
  return {
    upserts: new Set(entries.filter((e) => e.op === "upsert").map((e) => e.id)),
    deletes: new Set(entries.filter((e) => e.op === "delete").map((e) => e.id)),
  };
}

/**
 * Runs a remote write. The entity is queued *before* the request (so a refresh
 * running concurrently never drops an in-flight change) and removed from the
 * outbox once the write succeeds. Supabase errors are returned, not thrown, so
 * they are checked explicitly.
 */
export async function runRemote(
  userId: string,
  entry: OutboxEntry,
  write: () => PromiseLike<{ error: unknown } | void>
): Promise<boolean> {
  const seq = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  enqueue(userId, { ...entry, seq });
  try {
    const res = await write();
    if (res && res.error) throw res.error;
    // Only dequeue if no newer write was queued for this entity meanwhile
    const latest = getOutbox(userId).find((e) => e.kind === entry.kind && e.id === entry.id);
    if (latest?.seq === seq) dequeue(userId, entry.kind, entry.id);
    return true;
  } catch (err) {
    console.warn(`Remote ${entry.op} ${entry.kind}:${entry.id} failed, queued for retry`, err);
    return false;
  }
}

const time = (iso?: string) => (iso ? Date.parse(iso) || 0 : 0);

/**
 * Merges a freshly fetched remote list with the current local state, keeping
 * local changes that have not reached the server yet:
 * - entities in the outbox (failed writes, offline edits),
 * - entities edited locally while the fetch was running (`startedAt`),
 * - for the same entity, the most recently updated version wins.
 */
export function mergeWithPending<T extends { id: string; updatedAt?: string }>(
  userId: string,
  kind: OutboxKind,
  remote: T[],
  local: T[],
  startedAt: number
): T[] {
  const { upserts, deletes } = pendingFor(userId, kind);
  const localById = new Map(local.map((x) => [x.id, x]));
  const merged = remote
    .filter((x) => !deletes.has(x.id))
    .map((x) => {
      const mine = localById.get(x.id);
      if (!mine) return x;
      if (upserts.has(x.id) || time(mine.updatedAt) > time(x.updatedAt)) return mine;
      return x;
    });
  const remoteIds = new Set(remote.map((x) => x.id));
  for (const item of local) {
    if (remoteIds.has(item.id)) continue;
    if (upserts.has(item.id) || time(item.updatedAt) >= startedAt) merged.push(item);
  }
  return merged;
}
