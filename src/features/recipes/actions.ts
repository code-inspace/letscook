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

export function getStoredRecipes(userId?: string): Recipe[] {
  if (typeof window === "undefined") return [];

  // 1. Check in-memory cache
  if (memoryRecipesCache && memoryRecipesCache.length > 0) {
    return memoryRecipesCache;
  }

  // 2. Check user-specific localStorage key
  if (userId) {
    try {
      const raw = localStorage.getItem(`${RECIPES_STORAGE_KEY_PREFIX}${userId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          memoryRecipesCache = parsed;
          return parsed;
        }
      }
    } catch {}
  }

  // 3. Check global cache key
  try {
    const globalRaw = localStorage.getItem(GLOBAL_CACHE_KEY);
    if (globalRaw) {
      const parsed = JSON.parse(globalRaw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        memoryRecipesCache = parsed;
        return parsed;
      }
    }

    // 4. Scan any letscook_recipes_* keys in localStorage to recover all saved recipes
    const keys = Object.keys(localStorage).filter((k) =>
      k.startsWith(RECIPES_STORAGE_KEY_PREFIX)
    );
    let bestList: Recipe[] = [];
    for (const k of keys) {
      try {
        const raw = localStorage.getItem(k);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > bestList.length) {
            bestList = parsed;
          }
        }
      } catch {}
    }

    if (bestList.length > 0) {
      memoryRecipesCache = bestList;
      return bestList;
    }
  } catch {}

  return [];
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

    window.dispatchEvent(new CustomEvent("letscook:recipes-updated"));
  } catch (err) {
    console.warn("saveStoredRecipes error:", err);
  }
}

export async function fetchRecipesFromDb(userId: string): Promise<Recipe[]> {
  if (!userId) return getStoredRecipes();
  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from("recipes")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (!error && data && Array.isArray(data)) {
      // Parallel fast decryption using in-memory string cache
      const decryptedRecipes: Recipe[] = await Promise.all(
        data.map(async (row: any) => {
          let title = row.title;
          let ingredients = row.ingredients;
          let steps = row.steps;

          if (title && isEncrypted(title)) {
            title = await fastDecrypt(title);
          }

          if (typeof ingredients === "string" && isEncrypted(ingredients)) {
            const dec = await fastDecrypt(ingredients);
            try {
              ingredients = JSON.parse(dec);
            } catch {}
          }

          if (typeof steps === "string" && isEncrypted(steps)) {
            const dec = await fastDecrypt(steps);
            try {
              steps = JSON.parse(dec);
            } catch {}
          }

          return {
            id: row.id,
            userId: row.user_id,
            title: title || "Recette sans titre",
            subtitle: row.subtitle,
            category: row.category || "Main Dishes",
            imageUrl: row.image_url || "",
            prepTimeMinutes: row.prep_time_minutes || 30,
            difficulty: row.difficulty || "Easy",
            rating: row.rating || 5.0,
            servingsBase: row.servings_base || 4,
            spiceLevel: row.spice_level,
            utensils: row.utensils || [],
            nutrition: row.nutrition,
            allergens: row.allergens || [],
            ingredients: Array.isArray(ingredients) ? ingredients : [],
            steps: Array.isArray(steps) ? steps : [],
            isFavorite: Boolean(row.is_favorite),
            createdAt: row.created_at || new Date().toISOString(),
            updatedAt: row.updated_at || new Date().toISOString(),
          };
        })
      );

      // Merge with local list if any locally created recipe was pending sync
      const local = getStoredRecipes(userId);
      const mergedMap = new Map<string, Recipe>();
      decryptedRecipes.forEach((r) => mergedMap.set(r.id, r));
      local.forEach((r) => {
        if (!mergedMap.has(r.id)) {
          mergedMap.set(r.id, r);
        }
      });

      const finalList = Array.from(mergedMap.values());
      saveStoredRecipes(finalList, userId);
      return finalList;
    }
  } catch (err) {
    console.warn("fetchRecipesFromDb error, falling back to local cache:", err);
  }

  return getStoredRecipes(userId);
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
    const encryptedTitle = await encryptText(recipeWithUser.title);
    const encryptedIngredients = await encryptText(
      JSON.stringify(recipeWithUser.ingredients)
    );
    const encryptedSteps = await encryptText(
      JSON.stringify(recipeWithUser.steps)
    );

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
      is_favorite: Boolean(recipeWithUser.isFavorite),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("recipes")
      .upsert([payload], { onConflict: "id" });

    if (error) {
      console.warn("saveRecipeToDb Supabase upsert error:", error);
    }

    // 3. Upsert each ingredient into public.ingredients table
    if (recipeWithUser.ingredients && Array.isArray(recipeWithUser.ingredients)) {
      for (const ing of recipeWithUser.ingredients) {
        if (ing.name && ing.name.trim()) {
          const cleanName = ing.name.trim();
          const ingId = `ing_${cleanName.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
          try {
            await supabase
              .from("ingredients")
              .upsert(
                [
                  {
                    id: ingId,
                    name: cleanName,
                    category: categorizeIngredient(cleanName),
                    image_url: ing.imageUrl || null,
                    updated_at: new Date().toISOString(),
                  },
                ],
                { onConflict: "id" }
              );
          } catch {}
        }
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
