import { describe, expect, it } from "vitest";
import { searchRecipes, RecipeSearchFilters } from "../search";
import type { Recipe } from "../types";

const recipe = (id: string, over: Partial<Recipe>, ingredients: string[] = []): Recipe => ({
  id,
  userId: "me",
  title: id,
  category: "Main Dishes",
  imageUrl: "",
  prepTimeMinutes: 30,
  difficulty: "Easy",
  rating: 0,
  servingsBase: 4,
  ingredients: ingredients.map((name, i) => ({ id: `${i}`, name, amount: 1, unit: "" })),
  steps: [],
  createdAt: "",
  updatedAt: "",
  ...over,
});

const none: RecipeSearchFilters = { query: "", maxMinutes: null, onlyFavorites: false, category: "", have: "" };

const recipes = [
  recipe("Poulet riz", { prepTimeMinutes: 25 }, ["Blanc de poulet", "Riz basmati", "2 gousses d'ail", "Sel", "Huile d'olive"]),
  recipe("Dahl", { prepTimeMinutes: 45, isFavorite: true }, ["Lentilles", "Riz", "Lait de coco", "Oignon"]),
  recipe("Soupe", { category: "Soups & Stews", prepTimeMinutes: 20 }, ["Poireaux", "Pommes de terre"]),
];

describe("searchRecipes", () => {
  it("filters by text, time, favorites and category", () => {
    expect(searchRecipes(recipes, { ...none, query: "lentilles" }).map((r) => r.recipe.id)).toEqual(["Dahl"]);
    expect(searchRecipes(recipes, { ...none, query: "soupes" }).map((r) => r.recipe.id)).toEqual(["Soupe"]);
    expect(searchRecipes(recipes, { ...none, maxMinutes: 30 }).map((r) => r.recipe.id)).toEqual(["Poulet riz", "Soupe"]);
    expect(searchRecipes(recipes, { ...none, onlyFavorites: true }).map((r) => r.recipe.id)).toEqual(["Dahl"]);
    expect(searchRecipes(recipes, { ...none, category: "Soups & Stews" }).map((r) => r.recipe.id)).toEqual(["Soupe"]);
  });

  it("ranks recipes by what is missing from what I have", () => {
    const res = searchRecipes(recipes, { ...none, have: "poulet, riz, ail" });
    expect(res.map((r) => r.recipe.id)).toEqual(["Poulet riz", "Dahl"]);
    // salt and olive oil are pantry basics, never "missing"
    expect(res[0].missing).toEqual([]);
    expect(res[1].missing).toEqual(["Lentilles", "Lait de coco", "Oignon"]);
  });
});
