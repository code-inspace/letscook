import { Ingredient } from "./types";

/** AI-proposed correction for one ingredient (by its position in the recipe). */
export interface IngredientSuggestion {
  index: number;
  name: string;
  amount: number | null;
  unit: string;
  reason: string;
}

export type SuggestionDecision = "pending" | "accepted" | "rejected";

export interface ReviewedSuggestion extends IngredientSuggestion {
  decision: SuggestionDecision;
}

interface IngredientLike {
  name: string;
  amount: number | null;
  unit: string;
}

/** Validates the raw AI JSON: in-range unique indexes, numeric amounts, no no-op suggestions. */
export function sanitizeSuggestions(raw: unknown, ingredients: IngredientLike[]): IngredientSuggestion[] {
  const list = (raw as { suggestions?: unknown })?.suggestions;
  if (!Array.isArray(list)) return [];
  const seen = new Set<number>();
  const out: IngredientSuggestion[] = [];
  for (const s of list) {
    const index = Number(s?.index);
    if (!Number.isInteger(index) || index < 0 || index >= ingredients.length || seen.has(index)) continue;
    const original = ingredients[index];
    const parsedAmount =
      s?.amount === null || s?.amount === undefined || s?.amount === ""
        ? null
        : Number(String(s.amount).replace(",", "."));
    const suggestion: IngredientSuggestion = {
      index,
      name: typeof s?.name === "string" && s.name.trim() ? s.name.trim() : original.name,
      amount:
        parsedAmount !== null && Number.isFinite(parsedAmount) && parsedAmount >= 0
          ? Math.round(parsedAmount * 100) / 100
          : null,
      unit: typeof s?.unit === "string" ? s.unit.trim() : original.unit,
      reason: typeof s?.reason === "string" ? s.reason.trim() : "",
    };
    if (
      suggestion.name === original.name &&
      suggestion.amount === original.amount &&
      suggestion.unit === (original.unit || "")
    ) {
      continue;
    }
    seen.add(index);
    out.push(suggestion);
  }
  return out.sort((a, b) => a.index - b.index);
}

/** Applies the accepted (possibly hand-edited) suggestions; everything else is left untouched. */
export function applySuggestions(ingredients: Ingredient[], reviewed: ReviewedSuggestion[]): Ingredient[] {
  const accepted = new Map(
    reviewed.filter((s) => s.decision === "accepted").map((s) => [s.index, s])
  );
  return ingredients.map((ing, index) => {
    const s = accepted.get(index);
    if (!s) return ing;
    return {
      ...ing,
      name: s.name.trim() || ing.name,
      // Recipe ingredients store 0 for "no quantity"
      amount: s.amount ?? 0,
      unit: s.unit.trim(),
    };
  });
}
