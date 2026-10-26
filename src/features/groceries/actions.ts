import { useEffect } from "react";
import { ShoppingItem, RecipeContribution } from "./types";
import { categorizeIngredient } from "./categorizer";
import { createClient } from "@/utils/supabase/client";
import { fetchMealPlansFromDb, getStoredMealPlans, mealPlansStore } from "@/features/calendar/actions";
import { fetchRecipesFromDb, getStoredRecipes, recipesStore } from "@/features/recipes/actions";
import { createUserListStore, useUserList } from "@/lib/userStore";
import { DEFAULT_SERVINGS } from "@/features/recipes/types";
import { toDateKey } from "@/lib/utils";
import { dequeue, mergeWithPending, runRemote } from "@/lib/outbox";

export const shoppingStore = createUserListStore<ShoppingItem>(
  "letscook_shopping_items_",
  "letscook:groceries-updated",
  "idb"
);
const excludedStore = createUserListStore<string>("letscook_excluded_groceries_");

/** Keys of ingredients removed from the shopping list ("<meal_plan_id>_<ingredient>"). */
export function useExcludedIngredients(userId: string | null | undefined): string[] | null {
  return useUserList(excludedStore, userId);
}

export type IngredientAvailability = "have" | "missing" | "unknown";

/**
 * Whether an ingredient of a planned meal is covered: ticked in the shopping
 * list, or removed from it (the user already has it). "unknown" when the list
 * knows nothing about it (meal in the past, list not built yet).
 */
export function getIngredientAvailability(
  ingredientName: string,
  mealPlanId: string,
  items: ShoppingItem[],
  excludedKeys: string[]
): IngredientAvailability {
  const normKey = normalizeIngredientKey(ingredientName);
  if (!normKey) return "unknown";
  if (excludedKeys.includes(`${mealPlanId}_${normKey}`)) return "have";
  const item = items.find(
    (i) =>
      !i.isCustom &&
      i.normalizedKey === normKey &&
      (i.recipeSources || []).some((src) => src.mealPlanId === mealPlanId)
  );
  if (!item) return "unknown";
  return item.checked ? "have" : "missing";
}

export function getStoredShoppingItems(userId?: string | null): ShoppingItem[] {
  if (!userId || typeof window === "undefined") return [];
  return shoppingStore.read(userId);
}

export function saveStoredShoppingItems(items: ShoppingItem[], userId?: string | null): void {
  if (!userId) return;
  shoppingStore.write(userId, items);
}

export function getStoredExcludedIngredients(userId?: string | null): string[] {
  if (!userId || typeof window === "undefined") return [];
  return excludedStore.read(userId);
}

export function saveStoredExcludedIngredients(keys: string[], userId: string): void {
  if (!userId) return;
  excludedStore.write(userId, keys);
}

export function normalizeIngredientKey(name: string): string {
  if (!name) return "";
  let s = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
  // Remove leading articles (un, une, des, du, de, d', le, la, les)
  s = s.replace(/^(un|une|des|du|de|la|le|les|d'|d’)\s+/i, "");
  // Remove trailing plurals 's' or 'x'
  s = s.replace(/(s|x)$/i, "");
  return s.trim();
}

// Base64 images are copied into every shopping item otherwise (MBs per ingredient);
// the groceries page falls back to the recipe's own image.
const lightImage = (url?: string) => (url && !url.startsWith("data:") ? url : undefined);

const time = (iso?: string) => (iso ? Date.parse(iso) || 0 : 0);

interface RemoteCheckState {
  checked: boolean;
  updatedAt?: string;
}

/**
 * Recomputes the shopping list locally from upcoming meal plans + recipes.
 *
 * Purely local and synchronous: the list never waits for (nor is reordered by)
 * the network. Checked states are kept from the current list; when `remote`
 * states are provided, the most recently updated one wins.
 */
export function rebuildShoppingList(
  userId: string,
  remote?: Map<string, RemoteCheckState>
): ShoppingItem[] {
  // Inputs still being read from IndexedDB: rebuilding now would drop items
  if (
    !recipesStore.peek(userId) ||
    !mealPlansStore.peek(userId) ||
    !shoppingStore.peek(userId)
  ) {
    return shoppingStore.read(userId);
  }
  const current = getStoredShoppingItems(userId);
  const currentById = new Map(current.map((i) => [i.id, i]));
  const excludedKeys = new Set(getStoredExcludedIngredients(userId));
  const recipeMap = new Map(getStoredRecipes(userId).map((r) => [r.id, r]));
  const today = toDateKey();

  // Stable order: by date, then creation, then id
  const upcomingPlans = getStoredMealPlans(userId)
    .filter((p) => p.date >= today)
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        (a.createdAt || "").localeCompare(b.createdAt || "") ||
        a.id.localeCompare(b.id)
    );

  const aggregated = new Map<string, ShoppingItem>();

  for (const plan of upcomingPlans) {
    const recipe = recipeMap.get(plan.recipeId);
    if (!recipe || !Array.isArray(recipe.ingredients)) continue;
    // Quantities follow the number of servings chosen for this meal
    const factor = (plan.servings || DEFAULT_SERVINGS) / (recipe.servingsBase || DEFAULT_SERVINGS);

    for (const rawIng of recipe.ingredients) {
      if (!rawIng?.name) continue;
      const ing =
        typeof rawIng.amount === "number"
          ? { ...rawIng, amount: Math.round(rawIng.amount * factor * 100) / 100 }
          : rawIng;
      const normKey = normalizeIngredientKey(ing.name);
      if (!normKey) continue;
      const legacyKey = `${plan.id}_${ing.name.toLowerCase().trim()}`;
      if (excludedKeys.has(`${plan.id}_${normKey}`) || excludedKeys.has(legacyKey)) continue;

      const contribution: RecipeContribution = {
        recipeId: recipe.id,
        recipeTitle: recipe.title,
        recipeImageUrl: lightImage(recipe.imageUrl),
        amount: ing.amount || null,
        unit: ing.unit || null,
        mealPlanId: plan.id,
        mealPlanDate: plan.date,
      };

      const existing = aggregated.get(normKey);
      if (existing) {
        if (typeof existing.amount === "number" && typeof ing.amount === "number") {
          existing.amount = Math.round((existing.amount + ing.amount) * 100) / 100;
        } else if (typeof ing.amount === "number" && existing.amount == null) {
          existing.amount = ing.amount;
        }
        if (!existing.unit && ing.unit) existing.unit = ing.unit;
        if (
          !existing.recipeSources!.some(
            (s) => s.mealPlanId === plan.id && s.recipeId === recipe.id
          )
        ) {
          existing.recipeSources!.push(contribution);
        }
        continue;
      }

      const id = `auto_${normKey}`;
      const mine = currentById.get(id);
      const theirs = remote?.get(id);
      const useRemote = theirs && (!mine || time(theirs.updatedAt) > time(mine.updatedAt));

      aggregated.set(normKey, {
        id,
        userId,
        name: ing.name,
        normalizedKey: normKey,
        amount: ing.amount || null,
        unit: ing.unit || null,
        checked: useRemote ? theirs!.checked : Boolean(mine?.checked),
        isCustom: false,
        recipeId: recipe.id,
        recipeTitle: recipe.title,
        recipeImageUrl: lightImage(recipe.imageUrl),
        recipeSources: [contribution],
        mealPlanId: plan.id,
        mealPlanDate: plan.date,
        category: categorizeIngredient(ing.name),
        imageUrl: ing.imageUrl,
        createdAt: mine?.createdAt || plan.createdAt,
        updatedAt: useRemote ? theirs!.updatedAt : mine?.updatedAt,
      });
    }
  }

  const customItems = current.filter((i) => i.isCustom);
  const next = [...aggregated.values(), ...customItems];

  if (JSON.stringify(next) !== JSON.stringify(current)) {
    saveStoredShoppingItems(next, userId);
    return next;
  }
  return current;
}

function itemToRow(item: ShoppingItem, userId: string) {
  return {
    id: item.id,
    user_id: userId,
    name: item.name,
    amount: item.amount ?? null,
    unit: item.unit || null,
    checked: Boolean(item.checked),
    is_custom: Boolean(item.isCustom),
    recipe_id: item.recipeId || null,
    recipe_title: item.recipeTitle || null,
    // Aggregated items span several meal plans: no FK to a single plan, which would
    // cascade-delete the row (and its checked state) when that one plan is removed.
    meal_plan_id: null,
    meal_plan_date: item.mealPlanDate || null,
    category: item.category || "Articles divers",
    created_at: item.createdAt,
    updated_at: item.updatedAt || new Date().toISOString(),
  };
}

function rowToCustomItem(row: any): ShoppingItem {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    amount: row.amount != null ? Number(row.amount) : null,
    unit: row.unit,
    checked: Boolean(row.checked),
    isCustom: true,
    category: row.category || categorizeIngredient(row.name),
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || undefined,
  };
}

const REFRESH_MIN_INTERVAL_MS = 15 * 1000;
const lastRefreshAt = new Map<string, number>();
const inflightRefresh = new Map<string, Promise<ShoppingItem[]>>();

/**
 * Rebuilds the shopping list locally, then reconciles it with Supabase:
 * pulls checked states / custom items changed on other devices, pushes local
 * differences and removes rows that no longer belong to the list.
 */
export function syncAndFetchShoppingList(userId: string, force = false): Promise<ShoppingItem[]> {
  if (!userId) return Promise.resolve([]);
  const running = inflightRefresh.get(userId);
  if (running) return running;
  const throttled =
    !force && Date.now() - (lastRefreshAt.get(userId) || 0) < REFRESH_MIN_INTERVAL_MS;

  const promise = (async () => {
    const startedAt = Date.now();
    const supabase = createClient();
    await Promise.all([
      recipesStore.load(userId),
      mealPlansStore.load(userId),
      shoppingStore.load(userId),
    ]);
    const local = rebuildShoppingList(userId);
    if (throttled) {
      inflightRefresh.delete(userId);
      return local;
    }
    try {
      await Promise.all([
        fetchMealPlansFromDb(userId),
        fetchRecipesFromDb(userId),
        syncExclusions(userId),
      ]);

      const { data: rows, error } = await supabase
        .from("shopping_items")
        .select("*")
        .eq("user_id", userId);
      if (error || !rows) throw error || new Error("Lecture liste de courses impossible");

      // 1. Custom items: remote is the truth, except for unsynced local changes
      const current = getStoredShoppingItems(userId);
      const mergedCustom = mergeWithPending(
        userId,
        "shopping",
        rows.filter((r) => r.is_custom).map(rowToCustomItem),
        current.filter((i) => i.isCustom),
        startedAt
      );
      const withCustom = [...current.filter((i) => !i.isCustom), ...mergedCustom];
      if (JSON.stringify(withCustom) !== JSON.stringify(current)) {
        saveStoredShoppingItems(withCustom, userId);
      }

      // 2. Auto items: recompute, taking the newest checked state
      const remoteAuto = new Map<string, RemoteCheckState>(
        rows
          .filter((r) => !r.is_custom)
          .map((r) => [r.id, { checked: Boolean(r.checked), updatedAt: r.updated_at }])
      );
      const list = rebuildShoppingList(userId, remoteAuto);

      // 3. Push auto rows that differ, delete auto rows that left the list
      const rowsById = new Map(rows.map((r) => [r.id, r]));
      const toUpsert = list
        .filter((i) => !i.isCustom)
        .filter((i) => {
          const r = rowsById.get(i.id);
          return (
            !r ||
            Boolean(r.checked) !== i.checked ||
            r.name !== i.name ||
            Number(r.amount ?? NaN) !== Number(i.amount ?? NaN) ||
            (r.unit || null) !== (i.unit || null)
          );
        })
        .map((i) => itemToRow(i, userId));
      const listIds = new Set(list.map((i) => i.id));
      const stale = rows.filter((r) => !r.is_custom && !listIds.has(r.id)).map((r) => r.id);

      if (toUpsert.length > 0) {
        const { error: upsertError } = await supabase
          .from("shopping_items")
          .upsert(toUpsert, { onConflict: "id" });
        if (upsertError) console.warn("shopping_items upsert error:", upsertError);
      }
      if (stale.length > 0) {
        const { error: deleteError } = await supabase
          .from("shopping_items")
          .delete()
          .eq("user_id", userId)
          .in("id", stale);
        if (deleteError) console.warn("shopping_items cleanup error:", deleteError);
      }

      lastRefreshAt.set(userId, Date.now());
      return list;
    } catch (err) {
      console.warn("syncAndFetchShoppingList offline, using local list:", err);
      return getStoredShoppingItems(userId);
    } finally {
      inflightRefresh.delete(userId);
    }
  })();

  inflightRefresh.set(userId, promise);
  return promise;
}

/**
 * Union of local and remote exclusions (removed auto ingredients), so an item
 * removed on one device stays removed everywhere. Exclusions are never deleted,
 * which makes a plain union conflict-free. Best effort: the list works offline.
 */
async function syncExclusions(userId: string): Promise<void> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("shopping_exclusions")
    .select("key")
    .eq("user_id", userId);
  if (error || !data) {
    console.warn("shopping_exclusions read error:", error);
    return;
  }
  const remote = new Set(data.map((r) => r.key as string));
  const local = getStoredExcludedIngredients(userId);
  const missingLocally = [...remote].filter((k) => !local.includes(k));
  if (missingLocally.length > 0) saveStoredExcludedIngredients([...local, ...missingLocally], userId);

  const missingRemotely = local.filter((k) => !remote.has(k));
  if (missingRemotely.length > 0) {
    const { error: upsertError } = await supabase
      .from("shopping_exclusions")
      .upsert(
        missingRemotely.map((key) => ({ user_id: userId, key })),
        { onConflict: "user_id,key", ignoreDuplicates: true }
      );
    if (upsertError) console.warn("shopping_exclusions upsert error:", upsertError);
  }
}

export async function pushShoppingItem(userId: string, itemId: string): Promise<boolean> {
  await shoppingStore.load(userId);
  const item = getStoredShoppingItems(userId).find((i) => i.id === itemId);
  if (!item) {
    dequeue(userId, "shopping", itemId);
    return true;
  }
  return runRemote(userId, { kind: "shopping", op: "upsert", id: itemId }, () =>
    createClient()
      .from("shopping_items")
      .upsert([itemToRow(item, userId)], { onConflict: "id" })
  );
}

export async function pushShoppingDelete(userId: string, itemId: string): Promise<boolean> {
  return runRemote(userId, { kind: "shopping", op: "delete", id: itemId }, () =>
    createClient().from("shopping_items").delete().eq("id", itemId).eq("user_id", userId)
  );
}

export async function addCustomShoppingItem(
  name: string,
  amount: number | null,
  unit: string | null,
  userId: string
): Promise<ShoppingItem> {
  if (!userId) throw new Error("Authentification requise");

  const now = new Date().toISOString();
  const newItem: ShoppingItem = {
    id: `custom_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    userId,
    name: name.trim(),
    amount: amount || null,
    unit: unit ? unit.trim() : null,
    checked: false,
    isCustom: true,
    category: categorizeIngredient(name),
    createdAt: now,
    updatedAt: now,
  };

  await shoppingStore.update(userId, (list) => [newItem, ...list]);
  await pushShoppingItem(userId, newItem.id);

  // Shared ingredient catalog (autocomplete): best effort
  const cleanName = newItem.name;
  if (cleanName) {
    const ingId = `ing_${cleanName.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
    createClient()
      .from("ingredients")
      .upsert([{ id: ingId, name: cleanName, category: newItem.category, updated_at: now }], {
        onConflict: "id",
      })
      .then(({ error }) => error && console.warn("ingredients upsert error:", error));
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
  const now = new Date().toISOString();
  await shoppingStore.update(userId, (list) =>
    list.map((i) => (i.id === itemId ? { ...i, checked: newChecked, updatedAt: now } : i))
  );
  await pushShoppingItem(userId, itemId);
}

function exclusionKeysFor(item: ShoppingItem): string[] {
  if (item.isCustom) return [];
  const normKey = item.normalizedKey || normalizeIngredientKey(item.name);
  const legacyName = item.name.toLowerCase().trim();
  const planIds = item.recipeSources?.length
    ? item.recipeSources.map((s) => s.mealPlanId).filter((id): id is string => Boolean(id))
    : item.mealPlanId
    ? [item.mealPlanId]
    : [];
  return planIds.flatMap((planId) => [`${planId}_${normKey}`, `${planId}_${legacyName}`]);
}

function excludeItems(items: ShoppingItem[], userId: string) {
  const keys = items.flatMap(exclusionKeysFor);
  if (keys.length === 0) return;
  const current = getStoredExcludedIngredients(userId);
  const next = Array.from(new Set([...current, ...keys]));
  if (next.length === current.length) return;
  saveStoredExcludedIngredients(next, userId);
  // Pushed right away; if offline, the next sync uploads whatever is missing
  createClient()
    .from("shopping_exclusions")
    .upsert(
      keys.map((key) => ({ user_id: userId, key })),
      { onConflict: "user_id,key", ignoreDuplicates: true }
    )
    .then(({ error }) => error && console.warn("shopping_exclusions upsert error:", error));
}

export async function deleteShoppingItemFromList(item: ShoppingItem, userId: string): Promise<void> {
  if (!userId) return;
  // Auto items are excluded so they don't respawn on the next rebuild
  excludeItems([item], userId);
  await shoppingStore.update(userId, (list) => list.filter((i) => i.id !== item.id));
  await pushShoppingDelete(userId, item.id);
}

export async function clearCompletedShoppingItems(userId: string): Promise<void> {
  if (!userId) return;
  const checked = (await shoppingStore.load(userId)).filter((i) => i.checked);
  if (checked.length === 0) return;
  excludeItems(checked, userId);
  await shoppingStore.update(userId, (list) => list.filter((i) => !i.checked));
  await Promise.all(checked.map((i) => pushShoppingDelete(userId, i.id)));
}

/**
 * Shopping list of the given user. Rebuilt instantly whenever recipes or meal
 * plans change locally, reconciled with Supabase in the background.
 */
export function useShoppingItems(userId: string | null | undefined): ShoppingItem[] | null {
  const items = useUserList(shoppingStore, userId);
  useEffect(() => {
    if (!userId) return;
    syncAndFetchShoppingList(userId);
    const rebuild = () => rebuildShoppingList(userId);
    const unsubPlans = mealPlansStore.subscribe(rebuild);
    const unsubRecipes = recipesStore.subscribe(rebuild);
    const unsubExcluded = excludedStore.subscribe(rebuild);

    // Meals from a past day leave the list: recompute right after midnight too,
    // in case the page stays open across the day change
    let midnightTimer: ReturnType<typeof setTimeout>;
    const scheduleMidnightRebuild = () => {
      const next = new Date();
      next.setHours(24, 0, 5, 0);
      midnightTimer = setTimeout(() => {
        rebuild();
        scheduleMidnightRebuild();
      }, next.getTime() - Date.now());
    };
    scheduleMidnightRebuild();

    return () => {
      unsubPlans();
      unsubRecipes();
      unsubExcluded();
      clearTimeout(midnightTimer);
    };
  }, [userId]);
  return items;
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
