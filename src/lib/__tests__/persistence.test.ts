import { beforeEach, describe, expect, it, vi } from "vitest";

class MemoryStorage {
  private map = new Map<string, string>();
  get length() {
    return this.map.size;
  }
  key(i: number) {
    return Array.from(this.map.keys())[i] ?? null;
  }
  getItem(k: string) {
    return this.map.has(k) ? this.map.get(k)! : null;
  }
  setItem(k: string, v: string) {
    this.map.set(k, String(v));
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
  clear() {
    this.map.clear();
  }
}

// Fresh modules + storage for every test (stores keep module-level caches)
async function setup() {
  vi.resetModules();
  const storage = new MemoryStorage();
  const win = new EventTarget() as any;
  vi.stubGlobal("window", win);
  vi.stubGlobal("localStorage", storage);
  const userStore = await import("../userStore");
  const outbox = await import("../outbox");
  const legacy = await import("../legacyStorage");
  return { storage, ...userStore, ...outbox, ...legacy };
}

describe("createUserListStore", () => {
  beforeEach(() => vi.unstubAllGlobals());

  it("keeps an empty list as a real state instead of falling back to other keys", async () => {
    const { storage, createUserListStore } = await setup();
    storage.setItem("letscook_items_other-user", JSON.stringify([{ id: "foreign" }]));
    const store = createUserListStore<{ id: string }>("letscook_items_");

    store.write("me", [{ id: "a" }]);
    store.write("me", []);

    expect(store.read("me")).toEqual([]);
    expect(JSON.parse(storage.getItem("letscook_items_me")!)).toEqual([]);
  });

  it("returns a stable snapshot reference until the next write", async () => {
    const { createUserListStore } = await setup();
    const store = createUserListStore<{ id: string }>("letscook_items_");
    store.write("me", [{ id: "a" }]);
    const first = store.read("me");
    expect(store.read("me")).toBe(first);
    store.update("me", (l) => [...l, { id: "b" }]);
    expect(store.read("me")).not.toBe(first);
  });

  it("notifies subscribers on write", async () => {
    const { createUserListStore } = await setup();
    const store = createUserListStore<{ id: string }>("letscook_items_");
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    store.write("me", []);
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    store.write("me", []);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe("mergeWithPending", () => {
  beforeEach(() => vi.unstubAllGlobals());

  const startedAt = Date.parse("2026-10-07T10:00:00Z");

  it("uses the remote list as the truth (remote deletions are applied)", async () => {
    const { mergeWithPending } = await setup();
    const local = [
      { id: "kept", updatedAt: "2026-10-01T00:00:00Z" },
      { id: "deleted-elsewhere", updatedAt: "2026-10-01T00:00:00Z" },
    ];
    const remote = [{ id: "kept", updatedAt: "2026-10-01T00:00:00Z" }];
    expect(mergeWithPending("me", "recipe", remote, local, startedAt).map((x) => x.id)).toEqual([
      "kept",
    ]);
  });

  it("keeps unsynced local writes and hides unsynced local deletes", async () => {
    const { mergeWithPending, enqueue } = await setup();
    enqueue("me", { kind: "recipe", op: "upsert", id: "offline-new" });
    enqueue("me", { kind: "recipe", op: "delete", id: "offline-deleted" });
    const local = [{ id: "offline-new", updatedAt: "2026-10-01T00:00:00Z" }];
    const remote = [{ id: "offline-deleted", updatedAt: "2026-10-01T00:00:00Z" }];
    expect(mergeWithPending("me", "recipe", remote, local, startedAt).map((x) => x.id)).toEqual([
      "offline-new",
    ]);
  });

  it("keeps the most recent version of the same entity", async () => {
    const { mergeWithPending } = await setup();
    const local = [{ id: "r", title: "edited", updatedAt: "2026-10-07T10:00:05Z" }];
    const remote = [{ id: "r", title: "old", updatedAt: "2026-10-06T00:00:00Z" }];
    expect(mergeWithPending("me", "recipe", remote, local, startedAt)[0].title).toBe("edited");
  });

  it("keeps entities created locally while the fetch was running", async () => {
    const { mergeWithPending } = await setup();
    const local = [{ id: "just-created", updatedAt: "2026-10-07T10:00:01Z" }];
    expect(mergeWithPending("me", "recipe", [], local, startedAt)).toHaveLength(1);
  });
});

describe("runRemote", () => {
  beforeEach(() => vi.unstubAllGlobals());

  it("dequeues on success and keeps the entry queued on Supabase error", async () => {
    const { runRemote, getOutbox } = await setup();
    const entry = { kind: "mealPlan" as const, op: "upsert" as const, id: "p1" };

    await runRemote("me", entry, async () => ({ error: { message: "offline" } }));
    expect(getOutbox("me").map((e) => e.id)).toEqual(["p1"]);

    await runRemote("me", entry, async () => ({ error: null }));
    expect(getOutbox("me")).toEqual([]);
  });

  it("an older request finishing late does not dequeue a newer pending write", async () => {
    const { runRemote, getOutbox } = await setup();
    const entry = { kind: "shopping" as const, op: "upsert" as const, id: "i1" };
    let releaseFirst!: () => void;
    const first = runRemote(
      "me",
      entry,
      () => new Promise((resolve) => (releaseFirst = () => resolve({ error: null })))
    );
    await runRemote("me", entry, async () => ({ error: "network" }));
    releaseFirst();
    await first;
    expect(getOutbox("me").map((e) => e.id)).toEqual(["i1"]);
  });
});

describe("migrateLegacyStorage", () => {
  beforeEach(() => vi.unstubAllGlobals());

  it("removes resurrection sources and only seeds the user's own rows", async () => {
    const { storage, migrateLegacyStorage } = await setup();
    storage.setItem(
      "letscook_recipes_global_cache",
      JSON.stringify([
        { id: "mine", userId: "me" },
        { id: "theirs", userId: "other" },
      ])
    );
    storage.setItem("letscook_recipe_deleted", JSON.stringify({ id: "deleted" }));

    migrateLegacyStorage("me");

    expect(JSON.parse(storage.getItem("letscook_recipes_me")!)).toEqual([
      { id: "mine", userId: "me" },
    ]);
    expect(storage.getItem("letscook_recipes_global_cache")).toBeNull();
    expect(storage.getItem("letscook_recipe_deleted")).toBeNull();
  });
});
