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
    this.map.set(k, String(v));
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
}

describe("rebuildShoppingList", () => {
  it("scales quantities by the servings chosen for each planned meal", async () => {
    vi.resetModules();
    vi.stubGlobal("window", new EventTarget());
    vi.stubGlobal("localStorage", new MemoryStorage());
    const { recipesStore } = await import("@/features/recipes/actions");
    const { mealPlansStore } = await import("@/features/calendar/actions");
    const { rebuildShoppingList } = await import("../actions");

    recipesStore.write("me", [
      {
        id: "r1",
        userId: "me",
        title: "Gratin",
        category: "Main Dishes",
        imageUrl: "",
        prepTimeMinutes: 30,
        difficulty: "Easy",
        rating: 0,
        servingsBase: 4,
        ingredients: [{ id: "i1", name: "Pommes de terre", amount: 800, unit: "g" }],
        steps: [],
        createdAt: "2026-10-01T00:00:00Z",
        updatedAt: "2026-10-01T00:00:00Z",
      },
    ]);
    mealPlansStore.write("me", [
      { id: "p1", userId: "me", recipeId: "r1", recipeTitle: "Gratin", date: "2999-01-01", mealType: "dinner", servings: 2, createdAt: "2026-10-01T00:00:00Z" },
      { id: "p2", userId: "me", recipeId: "r1", recipeTitle: "Gratin", date: "2999-01-02", mealType: "dinner", servings: 6, createdAt: "2026-10-01T00:00:00Z" },
    ]);

    const list = rebuildShoppingList("me");
    // 800 g for 4 → 400 g (2 pers.) + 1200 g (6 pers.)
    expect(list).toHaveLength(1);
    expect(list[0].amount).toBe(1600);
    expect(list[0].recipeSources?.map((s) => s.amount)).toEqual([400, 1200]);
    vi.unstubAllGlobals();
  });
});
