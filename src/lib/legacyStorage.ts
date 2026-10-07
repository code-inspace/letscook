/**
 * One-shot cleanup of the old localStorage layout.
 *
 * Previous versions duplicated data into global caches and per-recipe keys and
 * merged every `letscook_*` key on read, which brought deleted recipes, meal
 * plans and shopping items back to life (and leaked data across accounts).
 * Data now lives only under per-user keys; Supabase stays the source of truth.
 */
const MIGRATION_FLAG = "letscook_storage_v2";

const GLOBAL_CACHES: Array<{ globalKey: string; userPrefix: string }> = [
  { globalKey: "letscook_recipes_global_cache", userPrefix: "letscook_recipes_" },
  { globalKey: "letscook_meal_plans_global_cache", userPrefix: "letscook_meal_plans_" },
  { globalKey: "letscook_shopping_items_global_cache", userPrefix: "letscook_shopping_items_" },
];

export function migrateLegacyStorage(userId: string | null | undefined): void {
  if (typeof window === "undefined" || !userId) return;
  try {
    if (localStorage.getItem(MIGRATION_FLAG)) return;

    // Seed the per-user key from the global cache only when it has never been written,
    // and only with rows that belong to this user.
    for (const { globalKey, userPrefix } of GLOBAL_CACHES) {
      const raw = localStorage.getItem(globalKey);
      if (raw && localStorage.getItem(`${userPrefix}${userId}`) === null) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            const own = parsed.filter((x) => x && x.id && (!x.userId || x.userId === userId));
            localStorage.setItem(`${userPrefix}${userId}`, JSON.stringify(own));
          }
        } catch {}
      }
      localStorage.removeItem(globalKey);
    }

    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) keys.push(key);
    }
    for (const key of keys) {
      const isIndividualRecipe =
        key.startsWith("letscook_recipe_") && !key.startsWith("letscook_recipes_");
      if (
        isIndividualRecipe ||
        key.startsWith("letscook_recipes_last_synced_") ||
        key.startsWith("letscook_last_sync_")
      ) {
        localStorage.removeItem(key);
      }
    }

    localStorage.setItem(MIGRATION_FLAG, new Date().toISOString());
  } catch (err) {
    console.warn("Legacy storage migration failed:", err);
  }
}
