import { MealPlan } from "./types";
import { createClient } from "@/utils/supabase/client";

const MEAL_PLANS_KEY_PREFIX = "letscook_meal_plans_";
const GLOBAL_MEAL_PLANS_CACHE_KEY = "letscook_meal_plans_global_cache";

// In-memory runtime cache for 0ms synchronous retrieval
let memoryMealPlansCache: MealPlan[] | null = null;

export function getStoredMealPlans(userId?: string): MealPlan[] {
  if (typeof window === "undefined") return [];

  // 1. Check in-memory cache
  if (memoryMealPlansCache && memoryMealPlansCache.length > 0) {
    return memoryMealPlansCache;
  }

  // 2. Check user-specific localStorage key
  if (userId) {
    try {
      const raw = localStorage.getItem(`${MEAL_PLANS_KEY_PREFIX}${userId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          memoryMealPlansCache = parsed;
          return parsed;
        }
      }
    } catch {}
  }

  // 3. Check global cache key
  try {
    const globalRaw = localStorage.getItem(GLOBAL_MEAL_PLANS_CACHE_KEY);
    if (globalRaw) {
      const parsed = JSON.parse(globalRaw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        memoryMealPlansCache = parsed;
        return parsed;
      }
    }

    // 4. Scan any letscook_meal_plans_* keys in localStorage
    const keys = Object.keys(localStorage).filter((k) =>
      k.startsWith(MEAL_PLANS_KEY_PREFIX)
    );
    for (const k of keys) {
      const raw = localStorage.getItem(k);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          memoryMealPlansCache = parsed;
          return parsed;
        }
      }
    }
  } catch {}

  return [];
}

export function saveStoredMealPlans(plans: MealPlan[], userId?: string): void {
  if (typeof window === "undefined") return;
  memoryMealPlansCache = plans;
  try {
    localStorage.setItem(GLOBAL_MEAL_PLANS_CACHE_KEY, JSON.stringify(plans));
    if (userId) {
      localStorage.setItem(
        `${MEAL_PLANS_KEY_PREFIX}${userId}`,
        JSON.stringify(plans)
      );
    }
    window.dispatchEvent(new CustomEvent("letscook:meal-plans-updated"));
  } catch (err) {
    console.warn("saveStoredMealPlans error:", err);
  }
}

export async function fetchMealPlansFromDb(userId: string): Promise<MealPlan[]> {
  if (!userId) return [];
  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from("meal_plans")
      .select("*")
      .eq("user_id", userId)
      .order("date", { ascending: true });

    if (!error && data && Array.isArray(data)) {
      const plans: MealPlan[] = data.map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        recipeId: row.recipe_id,
        recipeTitle: row.recipe_title || "Recette",
        recipeImageUrl: row.recipe_image_url,
        date: row.date,
        mealType: row.meal_type || "dinner",
        servings: row.servings || 2,
        notes: row.notes,
        createdAt: row.created_at || new Date().toISOString(),
        updatedAt: row.updated_at,
      }));

      saveStoredMealPlans(plans, userId);
      return plans;
    }
  } catch (err) {
    console.warn("fetchMealPlansFromDb error, using local storage:", err);
  }

  return getStoredMealPlans(userId);
}

export async function addOrUpdateMealPlan(
  plan: Omit<MealPlan, "id" | "createdAt" | "userId"> & { id?: string },
  userId: string
): Promise<MealPlan> {
  if (!userId) throw new Error("Authentification requise pour planifier un repas.");

  const newPlan: MealPlan = {
    id: plan.id || `plan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    userId,
    recipeId: plan.recipeId,
    recipeTitle: plan.recipeTitle,
    recipeImageUrl: plan.recipeImageUrl,
    date: plan.date,
    mealType: plan.mealType,
    servings: plan.servings || 2,
    notes: plan.notes,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // 1. Instant local sync
  const current = getStoredMealPlans(userId);
  const existingIdx = current.findIndex((p) => p.id === newPlan.id);
  const updatedList =
    existingIdx >= 0
      ? current.map((p) => (p.id === newPlan.id ? newPlan : p))
      : [...current, newPlan];
  saveStoredMealPlans(updatedList, userId);

  // 2. Supabase DB Upsert
  try {
    const supabase = createClient();
    const payload = {
      id: newPlan.id,
      user_id: userId,
      recipe_id: newPlan.recipeId,
      recipe_title: newPlan.recipeTitle,
      recipe_image_url: newPlan.recipeImageUrl,
      date: newPlan.date,
      meal_type: newPlan.mealType,
      servings: newPlan.servings,
      notes: newPlan.notes,
      updated_at: new Date().toISOString(),
    };

    await supabase.from("meal_plans").upsert([payload], { onConflict: "id" });
  } catch (err) {
    console.warn("addOrUpdateMealPlan Supabase error:", err);
  }

  return newPlan;
}

export async function deleteMealPlanFromDb(planId: string, userId: string): Promise<void> {
  if (!userId) return;

  const current = getStoredMealPlans(userId);
  const filtered = current.filter((p) => p.id !== planId);
  saveStoredMealPlans(filtered, userId);

  try {
    const supabase = createClient();
    await supabase
      .from("meal_plans")
      .delete()
      .eq("id", planId)
      .eq("user_id", userId);
  } catch (err) {
    console.warn("deleteMealPlanFromDb error:", err);
  }
}
