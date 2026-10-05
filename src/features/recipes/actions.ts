import { Recipe } from "./types";
import { encryptText, decryptText, isEncrypted } from "@/lib/crypto/encryption";
import { createClient } from "@/utils/supabase/client";

const RECIPES_STORAGE_KEY_PREFIX = "letscook_recipes_";

export function getStoredRecipes(userId?: string): Recipe[] {
  if (!userId || typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(`${RECIPES_STORAGE_KEY_PREFIX}${userId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch {}

  return [];
}

export function saveStoredRecipes(recipes: Recipe[], userId: string): void {
  if (!userId || typeof window === "undefined") return;
  try {
    localStorage.setItem(
      `${RECIPES_STORAGE_KEY_PREFIX}${userId}`,
      JSON.stringify(recipes)
    );
    window.dispatchEvent(new CustomEvent("letscook:recipes-updated"));
  } catch (err) {
    console.warn("saveStoredRecipes error:", err);
  }
}

export async function fetchRecipesFromDb(userId: string): Promise<Recipe[]> {
  if (!userId) return [];
  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from("recipes")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (!error && data && Array.isArray(data)) {
      const decryptedRecipes: Recipe[] = [];
      for (const row of data) {
        let title = row.title;
        let ingredients = row.ingredients;
        let steps = row.steps;

        if (title && isEncrypted(title)) title = await decryptText(title);
        if (typeof ingredients === "string" && isEncrypted(ingredients)) {
          const dec = await decryptText(ingredients);
          try {
            ingredients = JSON.parse(dec);
          } catch {}
        }
        if (typeof steps === "string" && isEncrypted(steps)) {
          const dec = await decryptText(steps);
          try {
            steps = JSON.parse(dec);
          } catch {}
        }

        decryptedRecipes.push({
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
        });
      }
      saveStoredRecipes(decryptedRecipes, userId);
      return decryptedRecipes;
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

  // 1. Instant local sync for snappy UI
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
