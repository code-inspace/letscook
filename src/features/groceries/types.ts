export interface ShoppingItem {
  id: string;
  userId: string;
  name: string;
  amount?: number | null;
  unit?: string | null;
  checked: boolean;
  isCustom: boolean;
  recipeId?: string;
  recipeTitle?: string;
  mealPlanId?: string;
  mealPlanDate?: string;
  category?: string;
  createdAt: string;
  updatedAt?: string;
}
