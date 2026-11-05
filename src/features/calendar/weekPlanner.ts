import type { Recipe } from "@/features/recipes/types";
import type { MealPlan } from "./types";
import { toDateKey } from "@/lib/utils";

export interface DaySuggestion {
  date: string; // YYYY-MM-DD
  recipeId: string | null;
}

const addDays = (date: Date, n: number) => {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
};

/**
 * Candidate recipes for automatic planning, best first: favourites and
 * well-rated recipes, never planned or planned long ago; recipes planned in the
 * last `recentDays` days come last (variety).
 */
export function rankCandidates(recipes: Recipe[], plans: MealPlan[], today: Date, recentDays = 21): Recipe[] {
  const lastPlanned = new Map<string, string>();
  for (const p of plans) {
    const prev = lastPlanned.get(p.recipeId);
    if (!prev || p.date > prev) lastPlanned.set(p.recipeId, p.date);
  }
  const recentLimit = toDateKey(addDays(today, -recentDays));
  const score = (r: Recipe) => {
    const last = lastPlanned.get(r.id);
    const recent = last && last >= recentLimit ? 1 : 0;
    return (
      recent * -100 + // avoid repeats
      (r.isFavorite ? 10 : 0) +
      (r.rating || 0) * 2 +
      (last ? 0 : 3) // never cooked: worth trying
    );
  };
  return [...recipes]
    .filter((r) => (r.ingredients || []).length > 0)
    .sort(
      (a, b) =>
        score(b) - score(a) ||
        (lastPlanned.get(a.id) || "").localeCompare(lastPlanned.get(b.id) || "") ||
        a.title.localeCompare(b.title)
    );
}

/**
 * One recipe per day without a meal over the next `days` days (today included),
 * never the same recipe twice in the week.
 */
export function suggestWeek(recipes: Recipe[], plans: MealPlan[], today = new Date(), days = 7): DaySuggestion[] {
  const plannedDates = new Set(plans.map((p) => p.date));
  const plannedThisWeek = new Set(
    plans
      .filter((p) => p.date >= toDateKey(today) && p.date <= toDateKey(addDays(today, days - 1)))
      .map((p) => p.recipeId)
  );
  const candidates = rankCandidates(recipes, plans, today).filter((r) => !plannedThisWeek.has(r.id));
  const out: DaySuggestion[] = [];
  let next = 0;
  for (let i = 0; i < days; i++) {
    const date = toDateKey(addDays(today, i));
    if (plannedDates.has(date)) continue;
    out.push({ date, recipeId: candidates[next]?.id ?? null });
    next++;
  }
  return out;
}

/** Next candidate for one day, skipping recipes already used in the suggestion. */
export function nextCandidate(
  ranked: Recipe[],
  current: string | null,
  used: Set<string>
): string | null {
  if (ranked.length === 0) return null;
  const start = current ? ranked.findIndex((r) => r.id === current) : -1;
  for (let k = 1; k <= ranked.length; k++) {
    const r = ranked[(start + k + ranked.length) % ranked.length];
    if (!used.has(r.id) || r.id === current) {
      if (r.id !== current) return r.id;
    }
  }
  return current;
}
