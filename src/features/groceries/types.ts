export interface RecipeContribution {
  recipeId: string;
  recipeTitle: string;
  recipeImageUrl?: string;
  amount?: number | null;
  unit?: string | null;
  mealPlanId?: string;
  mealPlanDate?: string;
}

export interface ShoppingItem {
  id: string;
  userId: string;
  name: string;
  normalizedKey?: string;
  amount?: number | null;
  unit?: string | null;
  checked: boolean;
  isCustom: boolean;
  recipeId?: string;
  recipeTitle?: string;
  recipeImageUrl?: string;
  recipeSources?: RecipeContribution[];
  mealPlanId?: string;
  mealPlanDate?: string;
  category?: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt?: string;
}

