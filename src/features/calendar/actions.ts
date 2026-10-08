import { useEffect } from "react";
import { MealPlan } from "./types";
import { DEFAULT_SERVINGS } from "@/features/recipes/types";
import { createClient } from "@/utils/supabase/client";
import { createUserListStore, useUserList } from "@/lib/userStore";
import { dequeue, mergeWithPending, runRemote } from "@/lib/outbox";

export const mealPlansStore = createUserListStore<MealPlan>(
  "letscook_meal_plans_",
  "letscook:meal-plans-updated",
  "idb"
);

export function getStoredMealPlans(userId?: string | null): MealPlan[] {
  if (!userId || typeof window === "undefined") return [];
  return mealPlansStore.read(userId);
}

export function saveStoredMealPlans(plans: MealPlan[], userId?: string | null): void {
  if (!userId) return;
  mealPlansStore.write(userId, plans);
}

function rowToMealPlan(row: any): MealPlan {
  return {
    id: row.id,
    userId: row.user_id,
    recipeId: row.recipe_id,
    recipeTitle: row.recipe_title || "Recette",
    // Older rows may hold a base64 copy of the recipe image: keep it on the recipe only
    recipeImageUrl:
      row.recipe_image_url && !row.recipe_image_url.startsWith("data:")
        ? row.recipe_image_url
        : undefined,
    date: row.date,
    mealType: row.meal_type || "dinner",
    servings: row.servings || DEFAULT_SERVINGS,
    notes: row.notes || undefined,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || undefined,
  };
}

const REFRESH_MIN_INTERVAL_MS = 15 * 1000;
const lastRefreshAt = new Map<string, number>();
const inflightRefresh = new Map<string, Promise<MealPlan[]>>();

export function fetchMealPlansFromDb(userId: string, force = false): Promise<MealPlan[]> {
  if (!userId) return Promise.resolve([]);
  const running = inflightRefresh.get(userId);
  if (running) return running;
  if (!force && Date.now() - (lastRefreshAt.get(userId) || 0) < REFRESH_MIN_INTERVAL_MS) {
    return Promise.resolve(getStoredMealPlans(userId));
  }

  const promise = (async () => {
    const startedAt = Date.now();
    try {
      await mealPlansStore.load(userId);
      const { data, error } = await createClient()
        .from("meal_plans")
        .select("*")
        .eq("user_id", userId)
        .order("date", { ascending: true });
      if (error || !data) throw error || new Error("Lecture planning impossible");

      const current = getStoredMealPlans(userId);
      const merged = mergeWithPending(
        userId,
        "mealPlan",
        data.map(rowToMealPlan),
        current,
        startedAt
      );
      if (JSON.stringify(merged) !== JSON.stringify(current)) {
        saveStoredMealPlans(merged, userId);
      }
      lastRefreshAt.set(userId, Date.now());
      return getStoredMealPlans(userId);
    } catch (err) {
      console.warn("fetchMealPlansFromDb error, using local cache:", err);
      return getStoredMealPlans(userId);
    } finally {
      inflightRefresh.delete(userId);
    }
  })();

  inflightRefresh.set(userId, promise);
  return promise;
}

export async function pushMealPlan(userId: string, planId: string): Promise<boolean> {
  await mealPlansStore.load(userId);
  const plan = getStoredMealPlans(userId).find((p) => p.id === planId);
  if (!plan) {
    dequeue(userId, "mealPlan", planId);
    return true;
  }
  return runRemote(userId, { kind: "mealPlan", op: "upsert", id: planId }, () =>
    createClient()
      .from("meal_plans")
      .upsert(
        [
          {
            id: plan.id,
            user_id: userId,
            recipe_id: plan.recipeId,
            recipe_title: plan.recipeTitle,
            recipe_image_url: plan.recipeImageUrl || null,
            date: plan.date,
            meal_type: plan.mealType || "dinner",
            servings: plan.servings || DEFAULT_SERVINGS,
            notes: plan.notes || null,
            created_at: plan.createdAt,
            updated_at: plan.updatedAt || new Date().toISOString(),
          },
        ],
        { onConflict: "id" }
      )
  );
}

export async function pushMealPlanDelete(userId: string, planId: string): Promise<boolean> {
  return runRemote(userId, { kind: "mealPlan", op: "delete", id: planId }, () =>
    createClient().from("meal_plans").delete().eq("id", planId).eq("user_id", userId)
  );
}

export async function addOrUpdateMealPlan(
  plan: Omit<MealPlan, "id" | "createdAt" | "userId"> & { id?: string },
  userId: string
): Promise<MealPlan> {
  if (!userId) throw new Error("Authentification requise pour planifier un repas.");

  const now = new Date().toISOString();
  await mealPlansStore.load(userId);
  const existing = plan.id ? getStoredMealPlans(userId).find((p) => p.id === plan.id) : undefined;
  const newPlan: MealPlan = {
    id: plan.id || `plan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    userId,
    recipeId: plan.recipeId,
    recipeTitle: plan.recipeTitle,
    // Base64 images stay on the recipe only (displays fall back to the recipe image)
    recipeImageUrl: plan.recipeImageUrl?.startsWith("data:") ? undefined : plan.recipeImageUrl,
    date: plan.date,
    mealType: plan.mealType,
    servings: plan.servings || DEFAULT_SERVINGS,
    notes: plan.notes,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  await mealPlansStore.update(userId, (list) =>
    list.some((p) => p.id === newPlan.id)
      ? list.map((p) => (p.id === newPlan.id ? newPlan : p))
      : [...list, newPlan]
  );

  await pushMealPlan(userId, newPlan.id);
  return newPlan;
}

export async function deleteMealPlanFromDb(planId: string, userId: string): Promise<void> {
  if (!userId) return;
  await mealPlansStore.update(userId, (list) => list.filter((p) => p.id !== planId));
  await pushMealPlanDelete(userId, planId);
}

/** Meal plans of the given user, from the local cache, kept in sync with Supabase. */
export function useMealPlans(userId: string | null | undefined): MealPlan[] | null {
  const plans = useUserList(mealPlansStore, userId);
  useEffect(() => {
    if (userId) fetchMealPlansFromDb(userId);
  }, [userId]);
  return plans;
}
