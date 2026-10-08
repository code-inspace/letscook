import { useEffect, useState } from "react";
import { Recipe, DEFAULT_SERVINGS } from "./types";
import { encryptText, decryptText, isEncrypted } from "@/lib/crypto/encryption";
import { createClient } from "@/utils/supabase/client";
import { categorizeIngredient } from "@/features/groceries/categorizer";
import { createUserListStore, useUserList } from "@/lib/userStore";
import { dequeue, mergeWithPending, runRemote } from "@/lib/outbox";
import { mealPlansStore } from "@/features/calendar/actions";

export const recipesStore = createUserListStore<Recipe>(
  "letscook_recipes_",
  "letscook:recipes-updated",
  "idb"
);

const decryptedTextCache = new Map<string, string>();

async function fastDecrypt(cipher: string): Promise<string> {
  if (!cipher || !isEncrypted(cipher)) return cipher;
  if (decryptedTextCache.has(cipher)) return decryptedTextCache.get(cipher)!;
  try {
    const plain = await decryptText(cipher);
    decryptedTextCache.set(cipher, plain);
    return plain;
  } catch {
    return cipher;
  }
}

export async function decryptRecipe(recipe: Recipe): Promise<Recipe> {
  if (!recipe) return recipe;

  let title = recipe.title;
  let ingredients: unknown = recipe.ingredients;
  let steps: unknown = recipe.steps;

  if (title && isEncrypted(title)) {
    title = await fastDecrypt(title);
  }

  if (typeof ingredients === "string") {
    try {
      ingredients = JSON.parse(await fastDecrypt(ingredients));
    } catch {
      ingredients = [];
    }
  } else if (Array.isArray(ingredients)) {
    ingredients = await Promise.all(
      ingredients.map(async (ing) => {
        if (ing && ing.name && isEncrypted(ing.name)) {
          return { ...ing, name: await fastDecrypt(ing.name) };
        }
        return ing;
      })
    );
  }

  if (typeof steps === "string") {
    try {
      steps = JSON.parse(await fastDecrypt(steps));
    } catch {
      steps = [];
    }
  }

  return {
    ...recipe,
    title: title || "Recette sans titre",
    ingredients: Array.isArray(ingredients) ? ingredients : [],
    steps: Array.isArray(steps) ? steps : [],
  };
}

export function getStoredRecipes(userId?: string | null): Recipe[] {
  if (!userId || typeof window === "undefined") return [];
  return recipesStore.read(userId);
}

export function getStoredRecipeById(recipeId: string, userId?: string | null): Recipe | null {
  if (!recipeId) return null;
  return getStoredRecipes(userId).find((r) => r.id === recipeId) || null;
}

export function saveStoredRecipes(recipes: Recipe[], userId?: string | null): void {
  if (!userId) return;
  recipesStore.write(userId, recipes);
}

function rowToRecipe(row: any): Recipe {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title || "Recette sans titre",
    subtitle: row.subtitle ?? undefined,
    category: row.category || "Main Dishes",
    imageUrl: row.image_url || "",
    prepTimeMinutes: row.prep_time_minutes || 30,
    difficulty: row.difficulty || "Easy",
    rating: Number(row.rating) || 0,
    servingsBase: row.servings_base || DEFAULT_SERVINGS,
    spiceLevel: row.spice_level ?? undefined,
    utensils: row.utensils || [],
    nutrition: row.nutrition ?? undefined,
    allergens: row.allergens || [],
    ingredients: row.ingredients,
    steps: row.steps,
    sourceUrl: row.source_url || undefined,
    videoUrl: row.video_url || undefined,
    isFavorite: Boolean(row.is_favorite),
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

async function recipeToRow(recipe: Recipe, userId: string) {
  const [title, ingredients, steps] = await Promise.all([
    encryptText(recipe.title),
    encryptText(JSON.stringify(recipe.ingredients || [])),
    encryptText(JSON.stringify(recipe.steps || [])),
  ]);
  return {
    id: recipe.id,
    user_id: userId,
    title,
    subtitle: recipe.subtitle ?? null,
    category: recipe.category,
    image_url: recipe.imageUrl,
    prep_time_minutes: recipe.prepTimeMinutes,
    difficulty: recipe.difficulty,
    rating: recipe.rating,
    servings_base: recipe.servingsBase,
    spice_level: recipe.spiceLevel ?? null,
    utensils: recipe.utensils ?? [],
    nutrition: recipe.nutrition ?? null,
    allergens: recipe.allergens ?? [],
    ingredients,
    steps,
    source_url: recipe.sourceUrl || null,
    video_url: recipe.videoUrl || null,
    is_favorite: Boolean(recipe.isFavorite),
    created_at: recipe.createdAt,
    updated_at: recipe.updatedAt || new Date().toISOString(),
  };
}

const sameInstant = (a?: string, b?: string) => {
  if (!a || !b) return false;
  return Date.parse(a) === Date.parse(b);
};

const REFRESH_MIN_INTERVAL_MS = 15 * 1000;
const FETCH_BATCH_SIZE = 10;
const lastRefreshAt = new Map<string, number>();
const inflightRefresh = new Map<string, Promise<Recipe[]>>();

/**
 * Refreshes the local recipe cache from Supabase and returns the up-to-date list.
 *
 * Only the `id, updated_at` index is downloaded on every refresh; full rows are
 * fetched just for recipes that are new or changed. Recipes deleted remotely are
 * removed locally, and local changes not yet pushed (outbox) are preserved.
 */
export function fetchRecipesFromDb(userId: string, force = false): Promise<Recipe[]> {
  if (!userId) return Promise.resolve([]);
  const running = inflightRefresh.get(userId);
  if (running) return running;
  if (!force && Date.now() - (lastRefreshAt.get(userId) || 0) < REFRESH_MIN_INTERVAL_MS) {
    return Promise.resolve(getStoredRecipes(userId));
  }

  const promise = (async () => {
    const supabase = createClient();
    const startedAt = Date.now();
    try {
      await recipesStore.load(userId);
      const { data: index, error: indexError } = await supabase
        .from("recipes")
        .select("id, updated_at")
        .eq("user_id", userId);
      if (indexError || !index) throw indexError || new Error("Index vide");

      const localById = new Map(getStoredRecipes(userId).map((r) => [r.id, r]));
      const toFetch = index
        .filter((row) => {
          const local = localById.get(row.id);
          return !local || !sameInstant(local.updatedAt, row.updated_at);
        })
        .map((row) => row.id as string);

      // Small batches (rows embed base64 images), each cached as soon as it arrives:
      // recipes show up progressively and survive the app being closed mid-sync.
      const fetched = new Map<string, Recipe>();
      for (let i = 0; i < toFetch.length; i += FETCH_BATCH_SIZE) {
        const { data, error } = await supabase
          .from("recipes")
          .select("*")
          .eq("user_id", userId)
          .in("id", toFetch.slice(i, i + FETCH_BATCH_SIZE));
        if (error || !data) throw error || new Error("Lecture recettes impossible");
        const decrypted = await Promise.all(data.map((row) => decryptRecipe(rowToRecipe(row))));
        decrypted.forEach((r) => fetched.set(r.id, r));
        if (toFetch.length > FETCH_BATCH_SIZE) {
          await recipesStore.update(userId, (list) => {
            const ids = new Set(decrypted.map((r) => r.id));
            return [...list.filter((r) => !ids.has(r.id)), ...decrypted];
          });
        }
      }

      const remote = index
        .map((row) => fetched.get(row.id) || localById.get(row.id))
        .filter((r): r is Recipe => Boolean(r));

      // Re-read local state: the user may have edited something while we were fetching
      const current = getStoredRecipes(userId);
      const merged = mergeWithPending(userId, "recipe", remote, current, startedAt);

      const currentById = new Map(current.map((r) => [r.id, r]));
      const unchanged =
        merged.length === current.length &&
        merged.every((r) => {
          const c = currentById.get(r.id);
          return c === r || (c && sameInstant(c.updatedAt, r.updatedAt) && c.isFavorite === r.isFavorite);
        });
      if (!unchanged) saveStoredRecipes(merged, userId);

      lastRefreshAt.set(userId, Date.now());
      return unchanged ? current : merged;
    } catch (err) {
      console.warn("fetchRecipesFromDb error, using local cache:", err);
      return getStoredRecipes(userId);
    } finally {
      inflightRefresh.delete(userId);
    }
  })();

  inflightRefresh.set(userId, promise);
  return promise;
}

/** Pushes the local version of a recipe to Supabase (queued for retry on failure). */
export async function pushRecipe(userId: string, recipeId: string): Promise<boolean> {
  await recipesStore.load(userId);
  const recipe = getStoredRecipeById(recipeId, userId);
  if (!recipe) {
    dequeue(userId, "recipe", recipeId);
    return true;
  }
  const supabase = createClient();
  const ok = await runRemote(userId, { kind: "recipe", op: "upsert", id: recipeId }, async () =>
    supabase.from("recipes").upsert([await recipeToRow(recipe, userId)], { onConflict: "id" })
  );

  if (ok && Array.isArray(recipe.ingredients)) {
    const now = new Date().toISOString();
    const ingredients = new Map<string, object>();
    for (const ing of recipe.ingredients) {
      const cleanName = ing?.name?.trim();
      if (!cleanName) continue;
      const id = `ing_${cleanName.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
      ingredients.set(id, {
        id,
        name: cleanName,
        category: categorizeIngredient(cleanName),
        image_url: ing.imageUrl || null,
        updated_at: now,
      });
    }
    if (ingredients.size > 0) {
      // Shared ingredient catalog: best effort, never blocks the recipe save
      supabase
        .from("ingredients")
        .upsert(Array.from(ingredients.values()), { onConflict: "id" })
        .then(({ error }) => error && console.warn("ingredients upsert error:", error));
    }
  }
  return ok;
}

export async function pushRecipeDelete(userId: string, recipeId: string): Promise<boolean> {
  const supabase = createClient();
  return runRemote(userId, { kind: "recipe", op: "delete", id: recipeId }, () =>
    supabase.from("recipes").delete().eq("id", recipeId).eq("user_id", userId)
  );
}

export async function saveRecipeToDb(recipe: Recipe, userId: string): Promise<Recipe> {
  if (!userId) {
    throw new Error("Authentification requise pour enregistrer une recette.");
  }

  const saved: Recipe = {
    ...recipe,
    userId,
    createdAt: recipe.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // 1. Instant local write
  await recipesStore.update(userId, (list) =>
    list.some((r) => r.id === saved.id)
      ? list.map((r) => (r.id === saved.id ? saved : r))
      : [saved, ...list]
  );

  // 2. Encrypted remote upsert (queued for retry if offline)
  await pushRecipe(userId, saved.id);
  return saved;
}

export async function deleteRecipeFromDb(recipeId: string, userId: string): Promise<void> {
  if (!userId) return;
  await recipesStore.update(userId, (list) => list.filter((r) => r.id !== recipeId));
  // Meal plans cascade-delete with the recipe in Supabase: mirror it locally
  const plans = await mealPlansStore.load(userId);
  if (plans.some((p) => p.recipeId === recipeId)) {
    await mealPlansStore.update(userId, (list) => list.filter((p) => p.recipeId !== recipeId));
  }
  await pushRecipeDelete(userId, recipeId);
}

export async function toggleFavoriteInDb(recipeId: string, userId: string): Promise<boolean> {
  if (!userId) return false;
  await recipesStore.load(userId);
  const target = getStoredRecipeById(recipeId, userId);
  if (!target) return false;

  const updated: Recipe = {
    ...target,
    isFavorite: !target.isFavorite,
    updatedAt: new Date().toISOString(),
  };
  await recipesStore.update(userId, (list) => list.map((r) => (r.id === recipeId ? updated : r)));
  await pushRecipe(userId, recipeId);
  return Boolean(updated.isFavorite);
}

/**
 * Recipes of the given user, from the local cache, kept in sync with Supabase.
 * Returns `null` until the cache is readable (SSR / hydration / unknown user).
 */
export function useRecipes(userId: string | null | undefined): Recipe[] | null {
  const recipes = useUserList(recipesStore, userId);
  const [settledFor, setSettledFor] = useState<string | null>(null);
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    fetchRecipesFromDb(userId).finally(() => !cancelled && setSettledFor(userId));
    return () => {
      cancelled = true;
    };
  }, [userId]);
  // First visit on this device: wait for the first fetch instead of flashing an empty state
  if (userId && recipes?.length === 0 && settledFor !== userId && recipesStore.isEmptyKey(userId)) {
    return null;
  }
  return recipes;
}
