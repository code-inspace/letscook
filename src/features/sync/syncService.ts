import { createClient } from "@/utils/supabase/client";
import { getStoredRecipes, saveStoredRecipes, fetchRecipesFromDb } from "@/features/recipes/actions";
import { getStoredMealPlans, saveStoredMealPlans, fetchMealPlansFromDb } from "@/features/calendar/actions";
import { getStoredShoppingItems, saveStoredShoppingItems, fetchCustomShoppingItemsFromDb } from "@/features/groceries/actions";
import { categorizeIngredient } from "@/features/groceries/categorizer";
import { encryptText, decryptText, isEncrypted } from "@/lib/crypto/encryption";

export interface SyncResult {
  success: boolean;
  recipesCount: number;
  mealPlansCount: number;
  shoppingCount: number;
  ingredientsCount: number;
  syncedAt: string;
  error?: string;
}

let isSyncInProgress = false;

/**
 * Scans all local data on the device (localStorage) and synchronizes bidirectionally with Supabase.
 * - Performs quiet bulk upserts to Supabase without firing intermediate event loops.
 * - Emits a single notification at the end to keep the UI perfectly stable and responsive.
 */
export async function syncAllLocalDataToSupabase(userId: string): Promise<SyncResult> {
  if (!userId || typeof window === "undefined") {
    return {
      success: false,
      recipesCount: 0,
      mealPlansCount: 0,
      shoppingCount: 0,
      ingredientsCount: 0,
      syncedAt: new Date().toISOString(),
      error: "Utilisateur non connecté.",
    };
  }

  if (isSyncInProgress) {
    return {
      success: true,
      recipesCount: getStoredRecipes(userId).length,
      mealPlansCount: getStoredMealPlans(userId).length,
      shoppingCount: getStoredShoppingItems(userId).length,
      ingredientsCount: 0,
      syncedAt: new Date().toISOString(),
    };
  }

  isSyncInProgress = true;
  const supabase = createClient();
  let recipesCount = 0;
  let mealPlansCount = 0;
  let shoppingCount = 0;
  let ingredientsCount = 0;

  try {
    // 1. SCAN AND BATCH SYNC RECIPES
    const localRecipes = getStoredRecipes(userId);
    const allKeys = Object.keys(localStorage);
    const orphanRecipeKeys = allKeys.filter(
      (k) => k.startsWith("letscook_recipes_") && k !== `letscook_recipes_${userId}`
    );
    for (const key of orphanRecipeKeys) {
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

    // Batch encrypt recipes and perform a single bulk upsert
    if (localRecipes.length > 0) {
      const recipePayloads = await Promise.all(
        localRecipes.map(async (recipe) => {
          const plainTitle = isEncrypted(recipe.title) ? await decryptText(recipe.title) : recipe.title;
          let plainIngredients = recipe.ingredients || [];
          if (typeof plainIngredients === "string" && isEncrypted(plainIngredients)) {
            try {
              plainIngredients = JSON.parse(await decryptText(plainIngredients));
            } catch {
              plainIngredients = [];
            }
          }
          let plainSteps = recipe.steps || [];
          if (typeof plainSteps === "string" && isEncrypted(plainSteps)) {
            try {
              plainSteps = JSON.parse(await decryptText(plainSteps));
            } catch {
              plainSteps = [];
            }
          }

          const [encryptedTitle, encryptedIngredients, encryptedSteps] = await Promise.all([
            encryptText(plainTitle),
            encryptText(JSON.stringify(plainIngredients)),
            encryptText(JSON.stringify(plainSteps)),
          ]);

          return {
            id: recipe.id,
            user_id: userId,
            title: encryptedTitle,
            subtitle: recipe.subtitle,
            category: recipe.category,
            image_url: recipe.imageUrl,
            prep_time_minutes: recipe.prepTimeMinutes,
            difficulty: recipe.difficulty,
            rating: recipe.rating,
            servings_base: recipe.servingsBase,
            spice_level: recipe.spiceLevel,
            utensils: recipe.utensils,
            nutrition: recipe.nutrition,
            allergens: recipe.allergens,
            ingredients: encryptedIngredients,
            steps: encryptedSteps,
            is_favorite: Boolean(recipe.isFavorite),
            updated_at: new Date().toISOString(),
          };
        })
      );

      const { error: upsertErr } = await supabase
        .from("recipes")
        .upsert(recipePayloads, { onConflict: "id" });

      if (upsertErr) {
        console.warn("Bulk recipe upsert error:", upsertErr);
      }
    }

    // 2. SCAN AND SYNC INGREDIENTS TABLE
    const distinctIngredients = new Map<string, { id: string; name: string; category: string; imageUrl?: string }>();
    for (const recipe of localRecipes) {
      if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
        for (const ing of recipe.ingredients) {
          if (ing.name && ing.name.trim()) {
            const cleanName = ing.name.trim();
            const ingId = `ing_${cleanName.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
            if (!distinctIngredients.has(ingId)) {
              distinctIngredients.set(ingId, {
                id: ingId,
                name: cleanName,
                category: categorizeIngredient(cleanName),
                imageUrl: ing.imageUrl || undefined,
              });
            }
          }
        }
      }
    }

    const ingredientsPayload = Array.from(distinctIngredients.values()).map((ing) => ({
      id: ing.id,
      name: ing.name,
      category: ing.category,
      image_url: ing.imageUrl || null,
      updated_at: new Date().toISOString(),
    }));

    if (ingredientsPayload.length > 0) {
      await supabase.from("ingredients").upsert(ingredientsPayload, { onConflict: "id" });
    }
    ingredientsCount = ingredientsPayload.length;

    // 3. SCAN AND BATCH SYNC MEAL PLANS
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

    const plansPayload = localPlans.map((plan) => ({
      id: plan.id,
      user_id: userId,
      recipe_id: plan.recipeId,
      recipe_title: plan.recipeTitle,
      recipe_image_url: plan.recipeImageUrl || null,
      date: plan.date,
      meal_type: plan.mealType || "dinner",
      servings: plan.servings || 2,
      notes: plan.notes || null,
      updated_at: new Date().toISOString(),
    }));

    if (plansPayload.length > 0) {
      await supabase.from("meal_plans").upsert(plansPayload, { onConflict: "id" });
    }

    // 4. SCAN AND BATCH SYNC SHOPPING ITEMS
    const localShopping = getStoredShoppingItems(userId);
    const shoppingPayload = localShopping.map((item) => ({
      id: item.id,
      user_id: userId,
      name: item.name,
      amount: item.amount || null,
      unit: item.unit || null,
      checked: Boolean(item.checked),
      is_custom: Boolean(item.isCustom),
      category: item.category || categorizeIngredient(item.name),
      updated_at: new Date().toISOString(),
    }));

    if (shoppingPayload.length > 0) {
      await supabase.from("shopping_items").upsert(shoppingPayload, { onConflict: "id" });
    }

    // 5. REFRESH LOCAL CACHE QUIETLY
    const [remoteRecipes, remotePlans, remoteShopping] = await Promise.all([
      fetchRecipesFromDb(userId),
      fetchMealPlansFromDb(userId),
      fetchCustomShoppingItemsFromDb(userId),
    ]);

    recipesCount = remoteRecipes.length;
    mealPlansCount = remotePlans.length;
    shoppingCount = remoteShopping.length;

    const nowIso = new Date().toISOString();
    localStorage.setItem(`letscook_last_sync_${userId}`, nowIso);

    // Dispatch a SINGLE clean update event at the end
    window.dispatchEvent(new CustomEvent("letscook:sync-completed"));

    return {
      success: true,
      recipesCount,
      mealPlansCount,
      shoppingCount,
      ingredientsCount,
      syncedAt: nowIso,
    };
  } catch (err: any) {
    console.error("Full synchronization error:", err);
    return {
      success: false,
      recipesCount,
      mealPlansCount,
      shoppingCount,
      ingredientsCount,
      syncedAt: new Date().toISOString(),
      error: err.message || "Erreur de synchronisation",
    };
  } finally {
    isSyncInProgress = false;
  }
}
