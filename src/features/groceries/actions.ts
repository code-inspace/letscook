import { ShoppingItem } from "./types";
import { categorizeIngredient } from "./categorizer";
import { createClient } from "@/utils/supabase/client";
import { fetchMealPlansFromDb, getStoredMealPlans } from "@/features/calendar/actions";
import { fetchRecipesFromDb, getStoredRecipes } from "@/features/recipes/actions";

const SHOPPING_ITEMS_KEY_PREFIX = "letscook_shopping_items_";
const EXCLUDED_ITEMS_KEY_PREFIX = "letscook_excluded_groceries_";

export function getStoredShoppingItems(userId?: string): ShoppingItem[] {
  if (!userId || typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(`${SHOPPING_ITEMS_KEY_PREFIX}${userId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

export function saveStoredShoppingItems(items: ShoppingItem[], userId: string): void {
  if (!userId || typeof window === "undefined") return;
  try {
    localStorage.setItem(
      `${SHOPPING_ITEMS_KEY_PREFIX}${userId}`,
      JSON.stringify(items)
    );
    window.dispatchEvent(new CustomEvent("letscook:groceries-updated"));
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

/**
 * Computes and synchronizes the full shopping list:
 * 1. Automatic upcoming meal plan ingredients (date >= today, not explicitly deleted)
 * 2. Custom manual ingredients added by the user
 */
export async function syncAndFetchShoppingList(userId: string): Promise<ShoppingItem[]> {
  if (!userId) return [];

  const todayStr = new Date().toISOString().split("T")[0];
  const excludedKeys = new Set(getStoredExcludedIngredients(userId));

  // 1. Fetch upcoming meal plans and all recipes
  const [plans, recipes, customItems] = await Promise.all([
    fetchMealPlansFromDb(userId),
    fetchRecipesFromDb(userId),
    fetchCustomShoppingItemsFromDb(userId),
  ]);

  const recipeMap = new Map(recipes.map((r) => [r.id, r]));

  // 2. Extract upcoming meal plans (today & future)
  const upcomingPlans = plans.filter((p) => p.date >= todayStr);

  const existingLocalItems = getStoredShoppingItems(userId);
  const checkStatusMap = new Map(
    existingLocalItems.map((item) => [item.id, item.checked])
  );

  const autoItems: ShoppingItem[] = [];

  for (const plan of upcomingPlans) {
    const recipe = recipeMap.get(plan.recipeId);
    if (!recipe || !recipe.ingredients) continue;

    for (const ing of recipe.ingredients) {
      const uniqueKey = `${plan.id}_${ing.name.toLowerCase().trim()}`;
      if (excludedKeys.has(uniqueKey)) continue;

      const itemId = `auto_${plan.id}_${ing.id || Math.random().toString(36).substring(2, 7)}`;
      const isChecked = checkStatusMap.get(itemId) ?? false;
      const deptCategory = categorizeIngredient(ing.name);

      autoItems.push({
        id: itemId,
        userId,
        name: ing.name,
        amount: ing.amount,
        unit: ing.unit,
        checked: isChecked,
        isCustom: false,
        recipeId: recipe.id,
        recipeTitle: recipe.title,
        mealPlanId: plan.id,
        mealPlanDate: plan.date,
        category: deptCategory,
        createdAt: plan.createdAt,
      });
    }
  }

  // 3. Merge auto items and custom items
  const fullList = [...autoItems, ...customItems];
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
  saveStoredShoppingItems([newItem, ...current], userId);

  try {
    const supabase = createClient();
    await supabase.from("shopping_items").insert([
      {
        id: newItem.id,
        user_id: userId,
        name: newItem.name,
        amount: newItem.amount,
        unit: newItem.unit,
        checked: newItem.checked,
        is_custom: true,
        category: newItem.category,
      },
    ]);
  } catch (err) {
    console.warn("addCustomShoppingItem DB error:", err);
  }

  return newItem;
}

export async function toggleShoppingItemInDb(
  itemId: string,
  newChecked: boolean,
  userId: string
): Promise<void> {
  if (!userId) return;

  const current = getStoredShoppingItems(userId);
  const updated = current.map((i) =>
    i.id === itemId ? { ...i, checked: newChecked } : i
  );
  saveStoredShoppingItems(updated, userId);

  const target = current.find((i) => i.id === itemId);
  if (target?.isCustom) {
    try {
      const supabase = createClient();
      await supabase
        .from("shopping_items")
        .update({ checked: newChecked, updated_at: new Date().toISOString() })
        .eq("id", itemId)
        .eq("user_id", userId);
    } catch (err) {
      console.warn("toggleShoppingItemInDb error:", err);
    }
  }
}

export async function deleteShoppingItemFromList(
  item: ShoppingItem,
  userId: string
): Promise<void> {
  if (!userId) return;

  // 1. If auto recipe item: add to excluded items set so it stays removed
  if (!item.isCustom && item.mealPlanId) {
    const uniqueKey = `${item.mealPlanId}_${item.name.toLowerCase().trim()}`;
    const excluded = getStoredExcludedIngredients(userId);
    if (!excluded.includes(uniqueKey)) {
      saveStoredExcludedIngredients([...excluded, uniqueKey], userId);
    }
  }

  // 2. Remove from local list
  const current = getStoredShoppingItems(userId);
  const filtered = current.filter((i) => i.id !== item.id);
  saveStoredShoppingItems(filtered, userId);

  // 3. If custom item, delete from Supabase
  if (item.isCustom) {
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
}

export async function clearCompletedShoppingItems(userId: string): Promise<void> {
  if (!userId) return;
  const current = getStoredShoppingItems(userId);
  const unchecked = current.filter((i) => !i.checked);
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
