import { Recipe, categoryLabel, normalizeCategory } from "./types";
import { ingredientKey } from "@/features/ingredients/canonical";

export interface RecipeSearchFilters {
  query: string;
  maxMinutes: number | null;
  onlyFavorites: boolean;
  category: string; // "" = all, else a RECIPE_CATEGORIES value
  /** Free text: "riz, poulet, oignon" — ingredients the user already has */
  have: string;
}

export interface RecipeSearchResult {
  recipe: Recipe;
  /** Only when `have` is set */
  missing?: string[];
  matched?: number;
}

// Always considered in the cupboard: never counted as missing
const PANTRY = new Set(["sel", "poivre", "huile", "huile olive", "huile vegetale", "eau", "sel poivre"]);

export function parseHaveList(text: string): Set<string> {
  return new Set(
    text
      .split(/[,;\n]+/)
      .map((s) => ingredientKey(s))
      .filter(Boolean)
  );
}

/** A recipe ingredient is covered by what the user has ("ail" covers "2 gousses d'ail"). */
function covered(ingKey: string, have: Set<string>): boolean {
  if (have.has(ingKey) || PANTRY.has(ingKey)) return true;
  // "poulet" also covers "blanc de poulet" / "cuisse de poulet"
  for (const h of have) {
    if (h.length >= 3 && ` ${ingKey} `.includes(` ${h} `)) return true;
  }
  return false;
}

export function searchRecipes(recipes: Recipe[], f: RecipeSearchFilters): RecipeSearchResult[] {
  const q = f.query.toLowerCase().trim();
  const have = parseHaveList(f.have);

  const results: RecipeSearchResult[] = [];
  for (const r of recipes) {
    if (q) {
      const match =
        r.title.toLowerCase().includes(q) ||
        r.ingredients?.some((ing) => ing.name.toLowerCase().includes(q)) ||
        r.category?.toLowerCase().includes(q) ||
        categoryLabel(r.category).toLowerCase().includes(q);
      if (!match) continue;
    }
    if (f.maxMinutes && (r.prepTimeMinutes || 0) > f.maxMinutes) continue;
    if (f.onlyFavorites && !r.isFavorite) continue;
    if (f.category && normalizeCategory(r.category) !== f.category) continue;

    if (have.size === 0) {
      results.push({ recipe: r });
      continue;
    }
    const ingredients = (r.ingredients || []).filter((i) => i?.name);
    const missing: string[] = [];
    let matched = 0;
    for (const ing of ingredients) {
      const key = ingredientKey(ing.name);
      if (!key) continue;
      if (covered(key, have)) {
        if (!PANTRY.has(key)) matched++;
      } else {
        missing.push(ing.name);
      }
    }
    // Only recipes using at least one of the listed ingredients
    if (matched === 0) continue;
    results.push({ recipe: r, missing, matched });
  }

  if (have.size > 0) {
    results.sort(
      (a, b) =>
        (a.missing!.length - b.missing!.length) ||
        (b.matched! - a.matched!) ||
        a.recipe.title.localeCompare(b.recipe.title)
    );
  }
  return results;
}
