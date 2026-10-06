import { ShoppingItem, RecipeContribution } from "./types";
import { categorizeIngredient } from "./categorizer";
import { createClient } from "@/utils/supabase/client";
import { MealPlan } from "@/features/calendar/types";
import { fetchMealPlansFromDb, getStoredMealPlans } from "@/features/calendar/actions";
import { Recipe } from "@/features/recipes/types";
import { fetchRecipesFromDb, getStoredRecipes } from "@/features/recipes/actions";

const SHOPPING_ITEMS_KEY_PREFIX = "letscook_shopping_items_";
const GLOBAL_GROCERIES_CACHE_KEY = "letscook_shopping_items_global_cache";
const EXCLUDED_ITEMS_KEY_PREFIX = "letscook_excluded_groceries_";

let memoryShoppingItemsCache: ShoppingItem[] | null = null;
let lastShoppingListSyncTime = 0;
const SYNC_COOLDOWN_MS = 25000; // 25 seconds cooldown to prevent constant refetching on tab switch

export function invalidateGroceriesSyncCooldown(): void {
  lastShoppingListSyncTime = 0;
}

export function getStoredShoppingItems(userId?: string): ShoppingItem[] {
  if (typeof window === "undefined") return [];

  // 1. In-memory cache
  if (memoryShoppingItemsCache && memoryShoppingItemsCache.length > 0) {
    return memoryShoppingItemsCache;
  }

  // 2. User specific key
  if (userId) {
    try {
      const raw = localStorage.getItem(`${SHOPPING_ITEMS_KEY_PREFIX}${userId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          memoryShoppingItemsCache = parsed;
          return parsed;
        }
      }
    } catch {}
  }

  // 3. Global cache
  try {
    const globalRaw = localStorage.getItem(GLOBAL_GROCERIES_CACHE_KEY);
    if (globalRaw) {
      const parsed = JSON.parse(globalRaw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        memoryShoppingItemsCache = parsed;
        return parsed;
      }
    }

    // 4. Scan any groceries key in localStorage
    const keys = Object.keys(localStorage).filter((k) =>
      k.startsWith(SHOPPING_ITEMS_KEY_PREFIX)
    );
    let bestList: ShoppingItem[] = [];
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
      memoryShoppingItemsCache = bestList;
      return bestList;
    }
  } catch {}

  return [];
}

export function saveStoredShoppingItems(
  items: ShoppingItem[],
  userId?: string,
  notify = true
): void {
  if (typeof window === "undefined") return;

  const previousJson = JSON.stringify(memoryShoppingItemsCache || []);
  const newJson = JSON.stringify(items);
  const isDifferent = previousJson !== newJson;

  memoryShoppingItemsCache = items;

  try {
    if (userId) {
      localStorage.setItem(`${SHOPPING_ITEMS_KEY_PREFIX}${userId}`, newJson);
    }
    localStorage.setItem(GLOBAL_GROCERIES_CACHE_KEY, newJson);
    if (notify && isDifferent) {
      window.dispatchEvent(new CustomEvent("letscook:groceries-updated"));
    }
  } catch (err) {
    console.warn("saveStoredShoppingItems error:", err);
  }
}

export function getStoredExcludedIngredients(userId?: string): string[] {
  if (!userId || typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(`${EXCLUDED_ITEMS_KEY_PREFIX}${userId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

export function saveStoredExcludedIngredients(keys: string[], userId: string): void {
  if (!userId || typeof window === "undefined") return;
  try {
    localStorage.setItem(
      `${EXCLUDED_ITEMS_KEY_PREFIX}${userId}`,
      JSON.stringify(keys)
    );
  } catch (err) {
    console.warn("saveStoredExcludedIngredients error:", err);
  }
}

export function normalizeIngredientKey(name: string): string {
  if (!name) return "";
  let s = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
  // Remove leading articles (un, une, des, du, de, d', le, la, les)
  s = s.replace(/^(un|une|des|du|de|la|le|les|d'|d’)\s+/i, "");
  // Remove trailing plurals 's' or 'x'
  s = s.replace(/(s|x)$/i, "");
  return s.trim();
}

/**
 * Computes, synchronizes and saves the full shopping list directly in Supabase DB:
 * 1. Reads existing DB shopping items.
 * 2. Mutualizes upcoming meal plan ingredients (date >= today).
 * 3. Persists all rows into public.shopping_items in Supabase.
 */
export async function syncAndFetchShoppingList(
  userId: string,
  force = false
): Promise<ShoppingItem[]> {
  if (!userId) return [];

  // If sync was performed recently and not forced, return cached items immediately
  if (!force && Date.now() - lastShoppingListSyncTime < SYNC_COOLDOWN_MS) {
    const cached = getStoredShoppingItems(userId);
    if (cached.length > 0) {
      return cached;
    }
  }

  const supabase = createClient();
  const todayStr = new Date().toISOString().split("T")[0];
  const excludedKeys = new Set(getStoredExcludedIngredients(userId));

  // 1. Fetch upcoming meal plans, recipes, and existing DB shopping items with full offline fallback
  let plans = getStoredMealPlans(userId);
  let recipes = getStoredRecipes(userId);
  let existingDbItems: any[] = [];

  try {
    const [fetchedPlans, fetchedRecipes, dbShoppingResult] = await Promise.all([
      fetchMealPlansFromDb(userId).catch(() => getStoredMealPlans(userId)),
      fetchRecipesFromDb(userId).catch(() => getStoredRecipes(userId)),
      supabase
        .from("shopping_items")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
    ]);
    if (fetchedPlans && fetchedPlans.length > 0) plans = fetchedPlans;
    if (fetchedRecipes && fetchedRecipes.length > 0) recipes = fetchedRecipes;
    if (dbShoppingResult && Array.isArray(dbShoppingResult.data)) {
      existingDbItems = dbShoppingResult.data;
    }
  } catch (netErr) {
    console.warn("syncAndFetchShoppingList running in offline mode:", netErr);
  }

  const recipeMap = new Map(recipes.map((r) => [r.id, r]));
  const cachedItems = getStoredShoppingItems(userId);

  // Track checked states from existing DB items or local cache
  const checkStatusMap = new Map<string, boolean>();
  if (existingDbItems.length > 0) {
    existingDbItems.forEach((row) => {
      checkStatusMap.set(row.id, Boolean(row.checked));
    });
  } else {
    cachedItems.forEach((it) => {
      checkStatusMap.set(it.id, Boolean(it.checked));
    });
  }

  // Extract custom manual items (from DB if available, else from local cache)
  let customItems: ShoppingItem[] = [];
  if (existingDbItems.length > 0) {
    customItems = existingDbItems
      .filter((row) => row.is_custom)
      .map((row) => ({
        id: row.id,
        userId: row.user_id,
        name: row.name,
        amount: row.amount,
        unit: row.unit,
        checked: Boolean(row.checked),
        isCustom: true,
        category: row.category || categorizeIngredient(row.name),
        createdAt: row.created_at || new Date().toISOString(),
      }));
  } else {
    customItems = cachedItems.filter((row) => row.isCustom);
  }

  // 2. Extract upcoming meal plans (today & future)
  const upcomingPlans = plans.filter((p) => p.date >= todayStr);

  // Aggregation Map by normalized key (e.g. "carotte" -> merged item with 10 + 5 = 15 carottes)
  const aggregatedMap = new Map<string, ShoppingItem>();

  for (const plan of upcomingPlans) {
    const recipe = recipeMap.get(plan.recipeId);
    if (!recipe || !recipe.ingredients) continue;

    for (const ing of recipe.ingredients) {
      const normKey = normalizeIngredientKey(ing.name);
      const uniqueKey = `${plan.id}_${normKey}`;
      const legacyKey = `${plan.id}_${ing.name.toLowerCase().trim()}`;

      if (excludedKeys.has(uniqueKey) || excludedKeys.has(legacyKey)) continue;

      const deptCategory = categorizeIngredient(ing.name);
      const recipeContribution: RecipeContribution = {
        recipeId: recipe.id,
        recipeTitle: recipe.title,
        recipeImageUrl: recipe.imageUrl,
        amount: ing.amount || null,
        unit: ing.unit || null,
        mealPlanId: plan.id,
        mealPlanDate: plan.date,
      };

      if (aggregatedMap.has(normKey)) {
        const existing = aggregatedMap.get(normKey)!;
        if (typeof existing.amount === "number" && typeof ing.amount === "number") {
          existing.amount = Math.round((existing.amount + ing.amount) * 100) / 100;
        } else if (typeof ing.amount === "number" && existing.amount === null) {
          existing.amount = ing.amount;
        }

        if (!existing.unit && ing.unit) {
          existing.unit = ing.unit;
        }

        if (!existing.recipeSources) {
          existing.recipeSources = [];
        }

        const hasSource = existing.recipeSources.some(
          (s) => s.mealPlanId === plan.id && s.recipeId === recipe.id
        );
        if (!hasSource) {
          existing.recipeSources.push(recipeContribution);
        }
      } else {
        const itemId = `auto_${normKey}`;
        const isChecked = checkStatusMap.get(itemId) ?? false;

        aggregatedMap.set(normKey, {
          id: itemId,
          userId,
          name: ing.name,
          normalizedKey: normKey,
          amount: ing.amount || null,
          unit: ing.unit || null,
          checked: isChecked,
          isCustom: false,
          recipeId: recipe.id,
          recipeTitle: recipe.title,
          recipeImageUrl: recipe.imageUrl,
          recipeSources: [recipeContribution],
          mealPlanId: plan.id,
          mealPlanDate: plan.date,
          category: deptCategory,
          imageUrl: ing.imageUrl,
          createdAt: plan.createdAt,
        });
      }
    }
  }

  const autoItems = Array.from(aggregatedMap.values());
  const fullList = [...autoItems, ...customItems];

  // 3. Persist all mutualized and custom items directly to Supabase DB
  try {
    const dbPayloads = fullList.map((item) => ({
      id: item.id,
      user_id: userId,
      name: item.name,
      amount: item.amount,
      unit: item.unit,
      checked: item.checked,
      is_custom: item.isCustom,
      recipe_id: item.recipeId || null,
      recipe_title: item.recipeTitle || null,
      meal_plan_id: item.mealPlanId || null,
      meal_plan_date: item.mealPlanDate || null,
      category: item.category || "Articles divers",
      updated_at: new Date().toISOString(),
    }));

    if (dbPayloads.length > 0) {
      await supabase.from("shopping_items").upsert(dbPayloads, { onConflict: "id" });
    }
  } catch (err) {
    console.warn("syncAndFetchShoppingList DB persist error:", err);
  }

  lastShoppingListSyncTime = Date.now();
  saveStoredShoppingItems(fullList, userId);
  return fullList;
}

export async function fetchCustomShoppingItemsFromDb(userId: string): Promise<ShoppingItem[]> {
  if (!userId) return [];
  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from("shopping_items")
      .select("*")
      .eq("user_id", userId)
      .eq("is_custom", true)
      .order("created_at", { ascending: false });

    if (!error && data && Array.isArray(data)) {
      return data.map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        name: row.name,
        amount: row.amount,
        unit: row.unit,
        checked: Boolean(row.checked),
        isCustom: true,
        category: row.category || categorizeIngredient(row.name),
        createdAt: row.created_at || new Date().toISOString(),
      }));
    }
  } catch (err) {
    console.warn("fetchCustomShoppingItemsFromDb error:", err);
  }

  const stored = getStoredShoppingItems(userId);
  return stored.filter((item) => item.isCustom);
}

export async function addCustomShoppingItem(
  name: string,
  amount: number | null,
  unit: string | null,
  userId: string
): Promise<ShoppingItem> {
  if (!userId) throw new Error("Authentification requise");

  const deptCategory = categorizeIngredient(name);

  const newItem: ShoppingItem = {
    id: `custom_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    userId,
    name: name.trim(),
    amount: amount || null,
    unit: unit ? unit.trim() : null,
    checked: false,
    isCustom: true,
    category: deptCategory,
    createdAt: new Date().toISOString(),
  };

  const current = getStoredShoppingItems(userId);
  const filtered = current.filter((i) => i.id !== newItem.id);
  saveStoredShoppingItems([newItem, ...filtered], userId);

  try {
    const supabase = createClient();
    await supabase.from("shopping_items").upsert([
      {
        id: newItem.id,
        user_id: userId,
        name: newItem.name,
        amount: newItem.amount,
        unit: newItem.unit,
        checked: newItem.checked,
        is_custom: true,
        category: newItem.category,
        updated_at: new Date().toISOString(),
      },
    ], { onConflict: "id" });

    // Également insérer l'ingrédient dans la table public.ingredients si nouveau
    const cleanName = newItem.name.trim();
    if (cleanName) {
      const ingId = `ing_${cleanName.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
      await supabase
        .from("ingredients")
        .upsert(
          [
            {
              id: ingId,
              name: cleanName,
              category: newItem.category,
              updated_at: new Date().toISOString(),
            },
          ],
          { onConflict: "id" }
        );
    }
  } catch (err) {
    console.warn("addCustomShoppingItem DB error:", err);
  }

  return newItem;
}

export async function toggleShoppingItemInDb(
  itemOrId: string | ShoppingItem,
  newChecked: boolean,
  userId: string
): Promise<void> {
  if (!userId) return;

  const itemId = typeof itemOrId === "string" ? itemOrId : itemOrId.id;
  const current = getStoredShoppingItems(userId);
  const targetItem = current.find((i) => i.id === itemId) || (typeof itemOrId === "object" ? itemOrId : null);

  const updated = current.map((i) =>
    i.id === itemId ? { ...i, checked: newChecked } : i
  );
  saveStoredShoppingItems(updated, userId);

  try {
    const supabase = createClient();
    if (targetItem) {
      const payload = {
        id: targetItem.id,
        user_id: userId,
        name: targetItem.name,
        amount: targetItem.amount || null,
        unit: targetItem.unit || null,
        checked: newChecked,
        is_custom: Boolean(targetItem.isCustom),
        recipe_id: targetItem.recipeId || null,
        recipe_title: targetItem.recipeTitle || null,
        meal_plan_id: targetItem.mealPlanId || null,
        meal_plan_date: targetItem.mealPlanDate || null,
        category: targetItem.category || "Articles divers",
        updated_at: new Date().toISOString(),
      };
      await supabase.from("shopping_items").upsert([payload], { onConflict: "id" });
    } else {
      await supabase
        .from("shopping_items")
        .update({ checked: newChecked, updated_at: new Date().toISOString() })
        .eq("id", itemId)
        .eq("user_id", userId);
    }
  } catch (err) {
    console.warn("toggleShoppingItemInDb error:", err);
  }
}

export async function deleteShoppingItemFromList(
  item: ShoppingItem,
  userId: string
): Promise<void> {
  if (!userId) return;

  // 1. If auto recipe item: add all contributing recipe keys to excluded items
  if (!item.isCustom) {
    const excluded = getStoredExcludedIngredients(userId);
    const newExcluded = [...excluded];
    const normKey = item.normalizedKey || normalizeIngredientKey(item.name);

    if (item.recipeSources && item.recipeSources.length > 0) {
      for (const source of item.recipeSources) {
        if (source.mealPlanId) {
          const k1 = `${source.mealPlanId}_${normKey}`;
          const k2 = `${source.mealPlanId}_${item.name.toLowerCase().trim()}`;
          if (!newExcluded.includes(k1)) newExcluded.push(k1);
          if (!newExcluded.includes(k2)) newExcluded.push(k2);
        }
      }
    } else if (item.mealPlanId) {
      const k1 = `${item.mealPlanId}_${normKey}`;
      const k2 = `${item.mealPlanId}_${item.name.toLowerCase().trim()}`;
      if (!newExcluded.includes(k1)) newExcluded.push(k1);
      if (!newExcluded.includes(k2)) newExcluded.push(k2);
    }

    if (newExcluded.length > excluded.length) {
      saveStoredExcludedIngredients(newExcluded, userId);
    }
  }

  // 2. Remove from local list
  const current = getStoredShoppingItems(userId);
  const filtered = current.filter((i) => i.id !== item.id);
  saveStoredShoppingItems(filtered, userId);

  // 3. Delete row directly from Supabase DB
  try {
    const supabase = createClient();
    await supabase
      .from("shopping_items")
      .delete()
      .eq("id", item.id)
      .eq("user_id", userId);
  } catch (err) {
    console.warn("deleteShoppingItemFromList DB error:", err);
  }
}

export async function clearCompletedShoppingItems(userId: string): Promise<void> {
  if (!userId) return;
  const current = getStoredShoppingItems(userId);
  const checkedItems = current.filter((i) => i.checked);
  const unchecked = current.filter((i) => !i.checked);

  // Exclude completed auto-recipe ingredients so they don't immediately respawn
  const excluded = getStoredExcludedIngredients(userId);
  const newExcluded = [...excluded];
  for (const item of checkedItems) {
    if (!item.isCustom) {
      const normKey = item.normalizedKey || normalizeIngredientKey(item.name);
      if (item.recipeSources && item.recipeSources.length > 0) {
        for (const source of item.recipeSources) {
          if (source.mealPlanId) {
            const k1 = `${source.mealPlanId}_${normKey}`;
            const k2 = `${source.mealPlanId}_${item.name.toLowerCase().trim()}`;
            if (!newExcluded.includes(k1)) newExcluded.push(k1);
            if (!newExcluded.includes(k2)) newExcluded.push(k2);
          }
        }
      } else if (item.mealPlanId) {
        const k1 = `${item.mealPlanId}_${normKey}`;
        const k2 = `${item.mealPlanId}_${item.name.toLowerCase().trim()}`;
        if (!newExcluded.includes(k1)) newExcluded.push(k1);
        if (!newExcluded.includes(k2)) newExcluded.push(k2);
      }
    }
  }
  if (newExcluded.length > excluded.length) {
    saveStoredExcludedIngredients(newExcluded, userId);
  }

  saveStoredShoppingItems(unchecked, userId);

  try {
    const supabase = createClient();
    await supabase
      .from("shopping_items")
      .delete()
      .eq("user_id", userId)
      .eq("checked", true);
  } catch (err) {
    console.warn("clearCompletedShoppingItems error:", err);
  }
}

export async function saveEntireShoppingListToDb(
  items: ShoppingItem[],
  userId: string
): Promise<void> {
  if (!userId) return;

  saveStoredShoppingItems(items, userId);

  try {
    const supabase = createClient();
    const dbPayloads = items.map((item) => ({
      id: item.id,
      user_id: userId,
      name: item.name,
      amount: item.amount || null,
      unit: item.unit || null,
      checked: Boolean(item.checked),
      is_custom: Boolean(item.isCustom),
      recipe_id: item.recipeId || null,
      recipe_title: item.recipeTitle || null,
      meal_plan_id: item.mealPlanId || null,
      meal_plan_date: item.mealPlanDate || null,
      category: item.category || "Articles divers",
      updated_at: new Date().toISOString(),
    }));

    if (dbPayloads.length > 0) {
      await supabase
        .from("shopping_items")
        .upsert(dbPayloads, { onConflict: "id" });
    }
  } catch (err) {
    console.warn("saveEntireShoppingListToDb DB error:", err);
  }
}

/**
 * Formats the shopping list into ready-to-export text for Apple Reminders / Share Sheet
 */
export function formatShoppingListForExport(items: ShoppingItem[]): string {
  const activeItems = items.filter((i) => !i.checked);
  if (activeItems.length === 0) return "Aucun article dans la liste de courses.";

  const lines = activeItems.map((item) => {
    const amountStr = item.amount ? `${item.amount} ` : "";
    const unitStr = item.unit ? `${item.unit} ` : "";
    const sourceStr = item.recipeTitle ? ` (${item.recipeTitle})` : "";
    return `• ${amountStr}${unitStr}${item.name}${sourceStr}`;
  });

  return `🛒 Liste de courses Let's Cook :\n\n${lines.join("\n")}`;
}
