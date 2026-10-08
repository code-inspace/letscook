export interface Ingredient {
  id: string;
  name: string;
  amount: number;
  unit: string;
  imageUrl?: string;
  category?: string;
}

export type IngredientItem = Ingredient;

export interface RecipeStep {
  stepNumber: number;
  title: string;
  description: string;
  imageUrl?: string;
  audioUrl?: string;
  originalCutoutUrl?: string;
  studioAiImageUrl?: string;
  imagePrompt?: string;
  durationMinutes?: number;
  chefTip?: string;
}

export interface NutritionInfo {
  caloriesKcal?: number;
  lipides?: string;
  glucides?: string;
  fibres?: string;
  proteines?: string;
  sel?: string;
}

export interface Recipe {
  id: string;
  userId: string;
  title: string;
  subtitle?: string;
  category: string;
  imageUrl: string;
  originalImageUrl?: string;
  studioAiImageUrl?: string;
  prepTimeMinutes: number;
  difficulty: "Easy" | "Medium" | "Hard";
  rating: number;
  servingsBase: number;
  spiceLevel?: string;
  utensils?: string[];
  nutrition?: NutritionInfo;
  allergens?: string[];
  ingredients: Ingredient[];
  steps: RecipeStep[];
  sourceUrl?: string;
  videoUrl?: string;
  isFavorite?: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Default number of servings, everywhere (import, edit form, planning, display). */
export const DEFAULT_SERVINGS = 6;

export const DIFFICULTY_LABELS: Record<Recipe["difficulty"], string> = {
  Easy: "Facile",
  Medium: "Moyen",
  Hard: "Difficile",
};

/** Stored category values (kept in English for existing data) → French labels. */
export const RECIPE_CATEGORIES: Array<{ value: string; label: string }> = [
  { value: "Main Dishes", label: "Plats" },
  { value: "Soups & Stews", label: "Soupes" },
  { value: "Appetizers", label: "Entrées" },
  { value: "Pastas", label: "Pâtes" },
  { value: "Desserts", label: "Desserts" },
  { value: "Salads", label: "Salades" },
  { value: "Breakfast", label: "Petit-déjeuner" },
  { value: "Sides", label: "Accompagnements" },
];

export function difficultyLabel(difficulty?: string): string {
  return DIFFICULTY_LABELS[difficulty as Recipe["difficulty"]] || difficulty || "Facile";
}

export function categoryLabel(category?: string): string {
  const value = normalizeCategory(category);
  return RECIPE_CATEGORIES.find((c) => c.value === value)!.label;
}

/** Maps any stored/AI category to one of RECIPE_CATEGORIES (unknown → "Main Dishes"). */
export function normalizeCategory(category?: string): string {
  const c = (category || "").trim().toLowerCase();
  const known = RECIPE_CATEGORIES.find(
    (x) => x.value.toLowerCase() === c || x.label.toLowerCase() === c
  );
  return known ? known.value : "Main Dishes";
}
