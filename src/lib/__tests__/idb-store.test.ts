import "fake-indexeddb/auto";
import { describe, expect, it, vi } from "vitest";

class MemoryStorage {
  private map = new Map<string, string>();
  get length() {
    return this.map.size;
  }
  key(i: number) {
    return Array.from(this.map.keys())[i] ?? null;
  }
  getItem(k: string) {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    // Same ~5 MB ceiling as iOS Safari
    if (v.length > 5_000_000) throw new Error("QuotaExceededError");
    this.map.set(k, String(v));
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
}

const bigRecipe = (i: number) => ({ id: `r${i}`, imageUrl: `data:image/png;base64,${"A".repeat(1_000_000)}` });

// A fresh module instance simulates relaunching the app (empty memory, same disk)
async function freshStore() {
  vi.resetModules();
  const { createUserListStore } = await import("../userStore");
  return createUserListStore<{ id: string; imageUrl?: string }>("letscook_recipes_", undefined, "idb");
}

describe("IndexedDB-backed store", () => {
  vi.stubGlobal("window", new EventTarget());
  const storage = new MemoryStorage();
  vi.stubGlobal("localStorage", storage);

  it("keeps every recipe across relaunches, far beyond the localStorage quota", async () => {
    const store = await freshStore();
    await store.load("me");
    store.write("me", Array.from({ length: 30 }, (_, i) => bigRecipe(i)));
    await new Promise((r) => setTimeout(r, 50)); // let the IndexedDB write commit

    const relaunched = await freshStore();
    expect(relaunched.peek("me")).toBeNull(); // not read yet → skeleton, not a partial list
    const list = await relaunched.load("me");
    expect(list).toHaveLength(30);
    expect(relaunched.isEmptyKey("me")).toBe(false);
  });

  it("migrates the old localStorage copy and frees it", async () => {
    storage.setItem("letscook_recipes_other", JSON.stringify([{ id: "legacy" }]));
    const store = await freshStore();
    expect(await store.load("other")).toEqual([{ id: "legacy" }]);
    await new Promise((r) => setTimeout(r, 50));
    expect(storage.getItem("letscook_recipes_other")).toBeNull();

    const relaunched = await freshStore();
    expect(await relaunched.load("other")).toEqual([{ id: "legacy" }]);
  });

  it("applies an update issued before the list was loaded on top of the stored data", async () => {
    const store = await freshStore();
    await store.update("me", (list) => [...list, { id: "new" }]);
    expect(store.read("me")).toHaveLength(31);
  });
});
