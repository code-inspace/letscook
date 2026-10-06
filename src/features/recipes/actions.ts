import { Recipe } from "./types";
import { encryptText, decryptText, isEncrypted } from "@/lib/crypto/encryption";
import { createClient } from "@/utils/supabase/client";
import { categorizeIngredient } from "@/features/groceries/categorizer";

const RECIPES_STORAGE_KEY_PREFIX = "letscook_recipes_";
const GLOBAL_CACHE_KEY = "letscook_recipes_global_cache";

// In-memory runtime caches for instant synchronous retrieval
let memoryRecipesCache: Recipe[] | null = null;
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

const INDIVIDUAL_RECIPE_PREFIX = "letscook_recipe_";

export function getStoredRecipeById(recipeId: string, userId?: string): Recipe | null {
  if (!recipeId || typeof window === "undefined") return null;

  // 1. Check in-memory cache
  if (memoryRecipesCache && memoryRecipesCache.length > 0) {
    const found = memoryRecipesCache.find((r) => r.id === recipeId);
    if (found) return found;
  }

  // 2. Check dedicated individual recipe localStorage key
  try {
    const indRaw = localStorage.getItem(`${INDIVIDUAL_RECIPE_PREFIX}${recipeId}`);
    if (indRaw) {
      const parsed = JSON.parse(indRaw);
      if (parsed && parsed.id === recipeId) return parsed;
    }
  } catch {}

  // 3. Check all stored recipes list
  const list = getStoredRecipes(userId);
  const found = list.find((r) => r.id === recipeId);
  if (found) return found;

  return null;
}

export function cacheRecipeOffline(recipe: Recipe): void {
  if (!recipe || !recipe.id || typeof window === "undefined") return;
  try {
    localStorage.setItem(`${INDIVIDUAL_RECIPE_PREFIX}${recipe.id}`, JSON.stringify(recipe));
  } catch (err) {
    console.warn("cacheRecipeOffline error:", err);
  }
}

export async function decryptRecipe(recipe: Recipe): Promise<Recipe> {
  if (!recipe) return recipe;

  let title = recipe.title;
  let ingredients = recipe.ingredients;
  let steps = recipe.steps;

  if (title && isEncrypted(title)) {
    title = await fastDecrypt(title);
  }

  if (typeof ingredients === "string" && isEncrypted(ingredients)) {
    const dec = await fastDecrypt(ingredients);
    try {
      ingredients = JSON.parse(dec);
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

  if (typeof steps === "string" && isEncrypted(steps)) {
    const dec = await fastDecrypt(steps);
    try {
      steps = JSON.parse(dec);
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

export function getStoredRecipes(userId?: string): Recipe[] {
  if (typeof window === "undefined") return [];

  const recipeMap = new Map<string, Recipe>();

  const ingest = (list: any[]) => {
    if (!Array.isArray(list)) return;
    for (const item of list) {
      if (item && typeof item === "object" && item.id) {
        if (!recipeMap.has(item.id)) {
          recipeMap.set(item.id, item);
        }
      }
    }
  };

  // 1. Check in-memory cache
  if (memoryRecipesCache && Array.isArray(memoryRecipesCache) && memoryRecipesCache.length > 0) {
    ingest(memoryRecipesCache);
  }

  // 2. Check user-specific localStorage key
  if (userId) {
    try {
      const raw = localStorage.getItem(`${RECIPES_STORAGE_KEY_PREFIX}${userId}`);
      if (raw) ingest(JSON.parse(raw));
    } catch {}
  }

  // 3. Check global cache key
  try {
    const globalRaw = localStorage.getItem(GLOBAL_CACHE_KEY);
    if (globalRaw) ingest(JSON.parse(globalRaw));
  } catch {}

  // 4. Scan any letscook_recipes_* and letscook_recipe_* keys in localStorage
  try {
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if (key.startsWith(RECIPES_STORAGE_KEY_PREFIX)) {
        try {
          const raw = localStorage.getItem(key);
          if (raw) ingest(JSON.parse(raw));
        } catch {}
      } else if (key.startsWith(INDIVIDUAL_RECIPE_PREFIX)) {
        try {
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && parsed.id && !recipeMap.has(parsed.id)) {
              recipeMap.set(parsed.id, parsed);
            }
          }
        } catch {}
      }
    }
  } catch {}

  const merged = Array.from(recipeMap.values());
  if (merged.length > 0) {
    memoryRecipesCache = merged;
    // If any item is encrypted, trigger background decryption
    if (merged.some((r) => isEncrypted(r.title))) {
      Promise.all(merged.map((r) => decryptRecipe(r))).then((cleanList) => {
        saveStoredRecipes(cleanList, userId);
      });
    }
  }

  return merged;
}

export function saveStoredRecipes(recipes: Recipe[], userId?: string): void {
  if (typeof window === "undefined") return;
  memoryRecipesCache = recipes;

  try {
    const json = JSON.stringify(recipes);
    if (userId) {
      localStorage.setItem(`${RECIPES_STORAGE_KEY_PREFIX}${userId}`, json);
    }
    // Always persist to global cache so all recipes are immediately available on load
    localStorage.setItem(GLOBAL_CACHE_KEY, json);

    // Cache each recipe individually for fast standalone offline lookups
    recipes.forEach((r) => {
      try {
        localStorage.setItem(`${INDIVIDUAL_RECIPE_PREFIX}${r.id}`, JSON.stringify(r));
      } catch {}
    });

    window.dispatchEvent(new CustomEvent("letscook:recipes-updated"));
  } catch (err) {
    console.warn("saveStoredRecipes error:", err);
  }
}

const SYNC_COOLDOWN_MS = 30 * 1000; // 30s throttling
let lastFetchTimestamp = 0;

export async function fetchRecipesFromDb(userId: string, forceFullRefresh = false): Promise<Recipe[]> {
  if (!userId) return getStoredRecipes();
  const supabase = createClient();

  const allLocal = getStoredRecipes(userId);
  const now = Date.now();
  const lastSyncKey = `letscook_recipes_last_synced_${userId}`;
  const lastSyncIso = typeof window !== "undefined" ? localStorage.getItem(lastSyncKey) : null;

  // If local cache is warm and sync happened within cooldown, avoid network roundtrip entirely
  if (!forceFullRefresh && allLocal.length > 0 && now - lastFetchTimestamp < SYNC_COOLDOWN_MS) {
    return allLocal;
  }
  lastFetchTimestamp = now;

  try {
    let query = supabase
      .from("recipes")
      .select("*")
      .eq("user_id", userId);

    // Delta sync: If we already have cached recipes, only request recipes changed since last sync
    if (!forceFullRefresh && allLocal.length > 0 && lastSyncIso) {
      query = query.gt("updated_at", lastSyncIso);
    } else {
      query = query.order("created_at", { ascending: false });
    }

    const { data, error } = await query;

    if (!error && data) {
      const newSyncIso = new Date().toISOString();
      if (typeof window !== "undefined") {
        localStorage.setItem(lastSyncKey, newSyncIso);
      }

      // If no records changed on remote DB, return local cache immediately with ZERO data transfer
      if (data.length === 0 && allLocal.length > 0) {
        return allLocal;
      }

      // Parallel fast decryption using in-memory string cache on newly fetched items only
      const decryptedDelta: Recipe[] = await Promise.all(
        data.map((row: any) =>
          decryptRecipe({
            id: row.id,
            userId: row.user_id,
            title: row.title || "Recette sans titre",
            subtitle: row.subtitle,
            category: row.category || "Main Dishes",
            imageUrl: row.image_url || "",
            prepTimeMinutes: row.prep_time_minutes || 30,
            difficulty: row.difficulty || "Easy",
            rating: row.rating || 5.0,
            servingsBase: row.servings_base || 6,
            spiceLevel: row.spice_level,
            utensils: row.utensils || [],
            nutrition: row.nutrition,
            allergens: row.allergens || [],
            ingredients: row.ingredients,
            steps: row.steps,
            sourceUrl: row.source_url || row.sourceUrl,
            videoUrl: row.video_url || row.videoUrl,
            isFavorite: Boolean(row.is_favorite),
            createdAt: row.created_at || new Date().toISOString(),
            updatedAt: row.updated_at || new Date().toISOString(),
          })
        )
      );

      // Merge delta recipes into local cache
      const mergedMap = new Map<string, Recipe>();
      if (!forceFullRefresh) {
        allLocal.forEach((r) => mergedMap.set(r.id, r));
      }
      decryptedDelta.forEach((r) => mergedMap.set(r.id, r));

      const finalList = Array.from(mergedMap.values());
      saveStoredRecipes(finalList, userId);

      return finalList;
    }
  } catch (err) {
    console.warn("fetchRecipesFromDb error, falling back to local cache:", err);
  }

  return allLocal;
}

export async function saveRecipeToDb(recipe: Recipe, userId: string): Promise<Recipe> {
  if (!userId) {
    throw new Error("Authentification requise pour enregistrer une recette.");
  }

  const recipeWithUser: Recipe = {
    ...recipe,
    userId,
  };

  const supabase = createClient();

  // 1. Instant local sync for snappy UI (0ms latency)
  const current = getStoredRecipes(userId);
  const existingIdx = current.findIndex((r) => r.id === recipeWithUser.id);
  const updatedList =
    existingIdx >= 0
      ? current.map((r) => (r.id === recipeWithUser.id ? recipeWithUser : r))
      : [recipeWithUser, ...current];
  saveStoredRecipes(updatedList, userId);

  // 2. Encrypted Supabase Upsert linked to the user account
  try {
    const [encryptedTitle, encryptedIngredients, encryptedSteps] = await Promise.all([
      encryptText(recipeWithUser.title),
      encryptText(JSON.stringify(recipeWithUser.ingredients || [])),
      encryptText(JSON.stringify(recipeWithUser.steps || [])),
    ]);

    const payload = {
      id: recipeWithUser.id,
      user_id: userId,
      title: encryptedTitle,
      subtitle: recipeWithUser.subtitle,
      category: recipeWithUser.category,
      image_url: recipeWithUser.imageUrl,
      prep_time_minutes: recipeWithUser.prepTimeMinutes,
      difficulty: recipeWithUser.difficulty,
      rating: recipeWithUser.rating,
      servings_base: recipeWithUser.servingsBase,
      spice_level: recipeWithUser.spiceLevel,
      utensils: recipeWithUser.utensils,
      nutrition: recipeWithUser.nutrition,
      allergens: recipeWithUser.allergens,
      ingredients: encryptedIngredients,
      steps: encryptedSteps,
      source_url: recipeWithUser.sourceUrl || null,
      video_url: recipeWithUser.videoUrl || null,
      is_favorite: Boolean(recipeWithUser.isFavorite),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("recipes")
      .upsert([payload], { onConflict: "id" });

    if (error) {
      console.warn("saveRecipeToDb Supabase upsert error:", error);
    }

    // 3. Upsert ingredients into public.ingredients table in a single batch
    if (recipeWithUser.ingredients && Array.isArray(recipeWithUser.ingredients)) {
      const distinctIngredients = recipeWithUser.ingredients
        .filter((ing) => ing.name && ing.name.trim())
        .map((ing) => {
          const cleanName = ing.name.trim();
          const ingId = `ing_${cleanName.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
          return {
            id: ingId,
            name: cleanName,
            category: categorizeIngredient(cleanName),
            image_url: ing.imageUrl || null,
            updated_at: new Date().toISOString(),
          };
        });

      if (distinctIngredients.length > 0) {
        await supabase
          .from("ingredients")
          .upsert(distinctIngredients, { onConflict: "id" });
      }
    }
  } catch (err) {
    console.warn("saveRecipeToDb encryption/network error:", err);
  }

  return recipeWithUser;
}

export async function deleteRecipeFromDb(recipeId: string, userId: string): Promise<void> {
  if (!userId) return;

  const current = getStoredRecipes(userId);
  const filtered = current.filter((r) => r.id !== recipeId);
  saveStoredRecipes(filtered, userId);

  try {
    const supabase = createClient();
    await supabase
      .from("recipes")
      .delete()
      .eq("id", recipeId)
      .eq("user_id", userId);
  } catch (err) {
    console.warn("deleteRecipeFromDb error:", err);
  }
}

export async function toggleFavoriteInDb(recipeId: string, userId: string): Promise<boolean> {
  if (!userId) return false;

  const current = getStoredRecipes(userId);
  const target = current.find((r) => r.id === recipeId);
  if (!target) return false;

  const newStatus = !target.isFavorite;
  target.isFavorite = newStatus;
  saveStoredRecipes(current, userId);

  try {
    const supabase = createClient();
    await supabase
      .from("recipes")
      .update({ is_favorite: newStatus, updated_at: new Date().toISOString() })
      .eq("id", recipeId)
      .eq("user_id", userId);
  } catch (err) {
    console.warn("toggleFavoriteInDb error:", err);
  }

  return newStatus;
}
