import { describe, expect, it } from "vitest";
import { nextCandidate, rankCandidates, suggestWeek } from "../weekPlanner";
import type { Recipe } from "@/features/recipes/types";
import type { MealPlan } from "../types";

const recipe = (id: string, over: Partial<Recipe> = {}): Recipe => ({
  id,
  userId: "me",
  title: id,
  category: "Main Dishes",
  imageUrl: "",
  prepTimeMinutes: 30,
  difficulty: "Easy",
  rating: 0,
  servingsBase: 4,
  ingredients: [{ id: "1", name: "Riz", amount: 1, unit: "" }],
  steps: [],
  createdAt: "",
  updatedAt: "",
  ...over,
});
const plan = (recipeId: string, date: string): MealPlan => ({
  id: `p_${recipeId}_${date}`,
  userId: "me",
  recipeId,
  recipeTitle: recipeId,
  date,
  mealType: "dinner",
  createdAt: "",
});

const today = new Date(2026, 10, 5); // 5 Nov 2026

describe("weekPlanner", () => {
  it("prefers favourites / rated recipes and avoids recently planned ones", () => {
    const recipes = [recipe("a"), recipe("fav", { isFavorite: true }), recipe("rated", { rating: 5 }), recipe("recent", { isFavorite: true })];
    const ranked = rankCandidates(recipes, [plan("recent", "2026-11-01")], today).map((r) => r.id);
    expect(ranked.slice(0, 2).sort()).toEqual(["fav", "rated"]);
    expect(ranked[2]).toBe("a");
    expect(ranked.at(-1)).toBe("recent");
  });

  it("fills only free days, without repeating a recipe", () => {
    const recipes = ["a", "b", "c", "d", "e", "f", "g"].map((id) => recipe(id));
    const plans = [plan("a", "2026-11-06"), plan("b", "2026-11-08")];
    const week = suggestWeek(recipes, plans, today);
    expect(week.map((d) => d.date)).toEqual(["2026-11-05", "2026-11-07", "2026-11-09", "2026-11-10", "2026-11-11"]);
    const ids = week.map((d) => d.recipeId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).not.toContain("a"); // already planned this week
  });

  it("swaps to the next unused candidate", () => {
    const ranked = ["a", "b", "c"].map((id) => recipe(id));
    expect(nextCandidate(ranked, "a", new Set(["a", "b"]))).toBe("c");
    expect(nextCandidate(ranked, "c", new Set(["c"]))).toBe("a");
  });
});
