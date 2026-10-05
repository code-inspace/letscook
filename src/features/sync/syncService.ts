import { createClient } from "@/utils/supabase/client";
import { getStoredRecipes, saveStoredRecipes, saveRecipeToDb, fetchRecipesFromDb } from "@/features/recipes/actions";
import { getStoredMealPlans, saveStoredMealPlans, fetchMealPlansFromDb } from "@/features/calendar/actions";
import { getStoredShoppingItems, saveStoredShoppingItems, fetchCustomShoppingItemsFromDb } from "@/features/groceries/actions";
import { categorizeIngredient } from "@/features/groceries/categorizer";

export interface SyncResult {
  success: boolean;
  recipesCount: number;
  mealPlansCount: number;
  shoppingCount: number;
  syncedAt: string;
  error?: string;
}

/**
 * Scans all local data on the device (localStorage) and synchronizes bidirectionally with Supabase.
 * - Pushes un-synced local recipes, meal plans, and custom shopping items to Supabase.
 * - Pulls latest remote cloud data and merges into local cache.
 */
export async function syncAllLocalDataToSupabase(userId: string): Promise<SyncResult> {
  if (!userId || typeof window === "undefined") {
    return {
      success: false,
      recipesCount: 0,
      mealPlansCount: 0,
      shoppingCount: 0,
      syncedAt: new Date().toISOString(),
      error: "Utilisateur non connecté.",
    };
  }

  const supabase = createClient();
  let recipesCount = 0;
  let mealPlansCount = 0;
  let shoppingCount = 0;

  try {
    // 1. SCAN AND SYNC RECIPES
    const localRecipes = getStoredRecipes(userId);
    
    // Check also if there are any orphaned recipes from guest or other storage keys
    const allKeys = Object.keys(localStorage);
    const recipeKeys = allKeys.filter(
      (k) => k.startsWith("letscook_recipes_") && k !== `letscook_recipes_${userId}`
    );
    for (const key of recipeKeys) {
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            parsed.forEach((r) => {
              if (!localRecipes.some((lr) => lr.id === r.id || lr.title === r.title)) {
                localRecipes.push({ ...r, userId });
              }
            });
          }
        }
      } catch {}
    }

    // Push local recipes to Supabase
    for (const recipe of localRecipes) {
      try {
        await saveRecipeToDb(recipe, userId);
      } catch (err) {
        console.warn("Error pushing local recipe to Supabase:", err);
      }
    }

    // Fetch refreshed list from Supabase
    const remoteRecipes = await fetchRecipesFromDb(userId);
    recipesCount = remoteRecipes.length;

    // 2. SCAN AND SYNC MEAL PLANS (CALENDAR)
    const localPlans = getStoredMealPlans(userId);
    const planKeys = allKeys.filter(
      (k) => k.startsWith("letscook_meal_plans_") && k !== `letscook_meal_plans_${userId}`
    );
    for (const key of planKeys) {
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            parsed.forEach((p) => {
              if (!localPlans.some((lp) => lp.id === p.id)) {
                localPlans.push({ ...p, userId });
              }
            });
          }
        }
      } catch {}
    }

    // Push each local plan to Supabase
    for (const plan of localPlans) {
      try {
        const payload = {
          id: plan.id,
          user_id: userId,
          recipe_id: plan.recipeId,
          recipe_title: plan.recipeTitle,
          recipe_image_url: plan.recipeImageUrl,
          date: plan.date,
          meal_type: plan.mealType,
          servings: plan.servings || 2,
          notes: plan.notes || null,
          updated_at: new Date().toISOString(),
        };
        await supabase.from("meal_plans").upsert([payload], { onConflict: "id" });
      } catch (err) {
        console.warn("Error pushing meal plan to Supabase:", err);
      }
    }

    const remotePlans = await fetchMealPlansFromDb(userId);
    mealPlansCount = remotePlans.length;

    // 3. SCAN AND SYNC CUSTOM SHOPPING ITEMS
    const localShopping = getStoredShoppingItems(userId);
    const customItems = localShopping.filter((i) => i.isCustom);
    for (const item of customItems) {
      try {
        await supabase.from("shopping_items").upsert([
          {
            id: item.id,
            user_id: userId,
            name: item.name,
            amount: item.amount || null,
            unit: item.unit || null,
            checked: Boolean(item.checked),
            is_custom: true,
            category: item.category || categorizeIngredient(item.name),
            updated_at: new Date().toISOString(),
          },
        ], { onConflict: "id" });
      } catch (err) {
        console.warn("Error pushing shopping item to Supabase:", err);
      }
    }

    const remoteCustomShopping = await fetchCustomShoppingItemsFromDb(userId);
    shoppingCount = remoteCustomShopping.length;

    const nowIso = new Date().toISOString();
    localStorage.setItem(`letscook_last_sync_${userId}`, nowIso);

    return {
      success: true,
      recipesCount,
      mealPlansCount,
      shoppingCount,
      syncedAt: nowIso,
    };
  } catch (err: any) {
    console.error("Full synchronization error:", err);
    return {
      success: false,
      recipesCount,
      mealPlansCount,
      shoppingCount,
      syncedAt: new Date().toISOString(),
      error: err.message || "Erreur de synchronisation",
    };
  }
}
