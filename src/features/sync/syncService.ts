import { fetchRecipesFromDb, pushRecipe, pushRecipeDelete } from "@/features/recipes/actions";
import { fetchMealPlansFromDb, pushMealPlan, pushMealPlanDelete } from "@/features/calendar/actions";
import {
  pushShoppingDelete,
  pushShoppingItem,
  syncAndFetchShoppingList,
} from "@/features/groceries/actions";
import { getOutbox, OutboxEntry } from "@/lib/outbox";

export interface SyncResult {
  success: boolean;
  recipesCount: number;
  mealPlansCount: number;
  shoppingCount: number;
  pendingCount: number;
  syncedAt: string;
  error?: string;
}

// Recipes first: meal plans reference recipes (FK) and shopping items derive from both
const KIND_ORDER: Record<OutboxEntry["kind"], number> = { recipe: 0, mealPlan: 1, shopping: 2 };

/** Retries every local write that has not reached Supabase yet. */
export async function flushOutbox(userId: string): Promise<number> {
  const entries = [...getOutbox(userId)].sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind]);
  for (const entry of entries) {
    if (entry.kind === "recipe") {
      await (entry.op === "delete" ? pushRecipeDelete(userId, entry.id) : pushRecipe(userId, entry.id));
    } else if (entry.kind === "mealPlan") {
      await (entry.op === "delete" ? pushMealPlanDelete(userId, entry.id) : pushMealPlan(userId, entry.id));
    } else {
      await (entry.op === "delete" ? pushShoppingDelete(userId, entry.id) : pushShoppingItem(userId, entry.id));
    }
  }
  return getOutbox(userId).length;
}

let inflight: Promise<SyncResult> | null = null;

/**
 * Pushes pending local changes, then refreshes recipes, meal plans and the
 * shopping list from Supabase. Concurrent calls share the same run.
 */
export function syncAllLocalDataToSupabase(userId: string, force = false): Promise<SyncResult> {
  if (!userId || typeof window === "undefined") {
    return Promise.resolve({
      success: false,
      recipesCount: 0,
      mealPlansCount: 0,
      shoppingCount: 0,
      pendingCount: 0,
      syncedAt: new Date().toISOString(),
      error: "Utilisateur non connecté.",
    });
  }
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const pendingCount = await flushOutbox(userId);
      const recipes = await fetchRecipesFromDb(userId, force);
      const plans = await fetchMealPlansFromDb(userId, force);
      const shopping = await syncAndFetchShoppingList(userId, force);
      window.dispatchEvent(new CustomEvent("letscook:sync-completed"));
      return {
        success: pendingCount === 0,
        recipesCount: recipes.length,
        mealPlansCount: plans.length,
        shoppingCount: shopping.length,
        pendingCount,
        syncedAt: new Date().toISOString(),
        error: pendingCount > 0 ? `${pendingCount} modification(s) en attente de réseau.` : undefined,
      };
    } catch (err: any) {
      console.error("Full synchronization error:", err);
      return {
        success: false,
        recipesCount: 0,
        mealPlansCount: 0,
        shoppingCount: 0,
        pendingCount: getOutbox(userId).length,
        syncedAt: new Date().toISOString(),
        error: err?.message || "Erreur de synchronisation",
      };
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}
