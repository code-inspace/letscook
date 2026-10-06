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
