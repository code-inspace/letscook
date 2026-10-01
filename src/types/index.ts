export type Plan = "BASIC" | "PREMIUM";
export type Difficulty = "EASY" | "MEDIUM" | "HARD";

export interface User {
  id: string;
  name: string;
  avatarUrl: string;
  plan: Plan;
  hasUnreadNotifications: boolean;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  imageUrl: string;
  order: number;
}

export interface Ingredient {
  id: string;
  name: string;
  imageUrl: string;
}

export interface RecipeIngredientItem {
  ingredientId: string;
  name: string;
  imageUrl: string;
  quantity: string;
  order: number;
}

export interface StepItem {
  id: string;
  recipeId: string;
  order: number;
  title: string;
  instruction: string;
  imageUrl: string;
  audioUrl?: string | null;
  markerX?: number | null;
  markerY?: number | null;
}

export interface RecipeDetail {
  id: string;
  title: string;
  slug: string;
  imageUrl: string;
  durationMinutes: number;
  difficulty: Difficulty;
  rating: number;
  isFeatured: boolean;
  categoryId: string;
  category: Category;
  ingredients: RecipeIngredientItem[];
  steps: StepItem[];
  ingredientCount: number;
  stepCount: number;
  formattedDuration: string;
  difficultyLabel: string;
  isFavorite?: boolean;
}

export interface FeaturedRecipeSummary {
  id: string;
  title: string;
  slug: string;
  imageUrl: string;
  durationMinutes: number;
  difficulty: Difficulty;
  rating: number;
  isFeatured: boolean;
  categoryId: string;
  ingredientCount: number;
  stepCount: number;
  formattedDuration: string;
  difficultyLabel: string;
}

// Helpers for computed properties
export function formatDuration(durationMinutes: number): string {
  if (durationMinutes < 60) {
    return `${durationMinutes}m`;
  }
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  return minutes > 0 ? `${hours}h${minutes < 10 ? "0" : ""}${minutes}` : `${hours}h`;
}

export function formatDifficulty(difficulty: Difficulty): string {
  switch (difficulty) {
    case "EASY":
      return "Easy";
    case "MEDIUM":
      return "Medium";
    case "HARD":
      return "Hard";
    default:
      return "Easy";
  }
}
