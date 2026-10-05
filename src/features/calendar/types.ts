export type MealType = "lunch" | "dinner" | "breakfast" | "snack";

export interface MealPlan {
  id: string;
  userId: string;
  recipeId: string;
  recipeTitle: string;
  recipeImageUrl?: string;
  date: string; // YYYY-MM-DD
  mealType: MealType;
  servings?: number;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}
