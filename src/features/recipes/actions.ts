import { Recipe } from "./types";
import { encryptText, decryptText, isEncrypted } from "@/lib/crypto/encryption";
import { createClient } from "@/utils/supabase/client";

const RECIPES_STORAGE_KEY_PREFIX = "letscook_recipes_";

export function getStoredRecipes(userId?: string): Recipe[] {
  const targetId = userId || "guest-user";
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(`${RECIPES_STORAGE_KEY_PREFIX}${targetId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch {}

  return [];
}

export function saveStoredRecipes(recipes: Recipe[], userId?: string): void {
  const targetId = userId || "guest-user";
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      `${RECIPES_STORAGE_KEY_PREFIX}${targetId}`,
      JSON.stringify(recipes)
    );
    window.dispatchEvent(new CustomEvent("letscook:recipes-updated"));
  } catch (err) {
    console.warn("saveStoredRecipes error:", err);
  }
}

export async function fetchRecipesFromDb(userId?: string): Promise<Recipe[]> {
  const targetId = userId || "guest-user";
  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from("recipes")
      .select("*")
      .eq("user_id", targetId)
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
      saveStoredRecipes(decryptedRecipes, targetId);
      return decryptedRecipes;
    }
  } catch (err) {
    console.warn("fetchRecipesFromDb error, falling back to local storage:", err);
  }

  return getStoredRecipes(targetId);
}

export async function saveRecipeToDb(recipe: Recipe, userId?: string): Promise<Recipe> {
  const targetId = userId || recipe.userId || "guest-user";
  const supabase = createClient();

  // 1. Instant local sync
  const current = getStoredRecipes(targetId);
  const existingIdx = current.findIndex((r) => r.id === recipe.id);
  const updatedList =
    existingIdx >= 0
      ? current.map((r) => (r.id === recipe.id ? recipe : r))
      : [recipe, ...current];
  saveStoredRecipes(updatedList, targetId);

  // 2. Encrypted Supabase Upsert
  try {
    const encryptedTitle = await encryptText(recipe.title);
    const encryptedIngredients = await encryptText(JSON.stringify(recipe.ingredients));
    const encryptedSteps = await encryptText(JSON.stringify(recipe.steps));

    const payload = {
      id: recipe.id,
      user_id: targetId,
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

    await supabase.from("recipes").upsert([payload], { onConflict: "id" });
  } catch (err) {
    console.warn("saveRecipeToDb Supabase sync warning:", err);
  }

  return recipe;
}
