import type { NutritionInfo } from "@/features/recipes/types";

const TEXT_FIELDS = ["proteines", "glucides", "lipides", "fibres", "sel"] as const;

/**
 * Keeps only the nutrition values the AI actually read (null / empty / "--" are
 * dropped). Returns undefined when nothing is left, so the recipe page hides the
 * Nutrition tab instead of showing invented or empty numbers.
 */
export function cleanNutrition(raw: unknown): NutritionInfo | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const src = raw as Record<string, unknown>;
  const out: NutritionInfo = {};

  const kcal = Number(String(src.caloriesKcal ?? "").replace(",", ".").replace(/[^\d.]/g, ""));
  if (src.caloriesKcal != null && src.caloriesKcal !== "" && Number.isFinite(kcal) && kcal > 0) {
    out.caloriesKcal = Math.round(kcal);
  }
  for (const key of TEXT_FIELDS) {
    const value = src[key];
    if (value == null) continue;
    const text = String(value).trim();
    if (!text || text === "--" || /^null$/i.test(text) || !/\d/.test(text)) continue;
    out[key] = /^\d+([.,]\d+)?$/.test(text) ? `${text}g` : text;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}
