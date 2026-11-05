"use client";

import { useAuth } from "@/providers/AuthProvider";
import { useRecipes } from "@/features/recipes/actions";
import { addOrUpdateMealPlan, useMealPlans } from "@/features/calendar/actions";
import { syncAndFetchShoppingList, useShoppingItems } from "@/features/groceries/actions";
import { useReferenceServings } from "@/features/settings/referenceServings";
import { toDateKey } from "@/lib/utils";
import type { Recipe } from "@/features/recipes/types";
import { HomeView } from "@/components/home-view/HomeView";

export default function HomePage() {
  const { user } = useAuth();
  const recipes = useRecipes(user?.id);
  const plans = useMealPlans(user?.id);
  const shoppingItems = useShoppingItems(user?.id);
  const referenceServings = useReferenceServings(user?.id);

  const planTonight = async (recipe: Recipe) => {
    if (!user?.id) return;
    await addOrUpdateMealPlan(
      {
        recipeId: recipe.id,
        recipeTitle: recipe.title,
        recipeImageUrl: recipe.imageUrl,
        date: toDateKey(),
        mealType: "dinner",
        servings: referenceServings,
      },
      user.id
    );
    syncAndFetchShoppingList(user.id, true);
  };

  return (
    <HomeView
      storedRecipes={recipes}
      storedPlans={plans}
      shoppingItems={shoppingItems}
      userName={user?.name}
      onPlanTonight={planTonight}
    />
  );
}
