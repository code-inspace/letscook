import { normalizeIngredientKey } from "./actions";
import { ShoppingItem } from "./types";

/** Name of the iOS Shortcut that copies the open reminders of the "Courses" list. */
export const REMINDERS_SHORTCUT_NAME = "Courses vers Let's Cook";

export function remindersShortcutUrl(): string {
  return `shortcuts://run-shortcut?name=${encodeURIComponent(REMINDERS_SHORTCUT_NAME)}`;
}

export interface ParsedReminder {
  name: string;
  amount: number | null;
  unit: string | null;
  /** Already in the (unchecked) shopping list */
  duplicate: boolean;
}

const UNITS = [
  "kg", "g", "mg", "l", "cl", "ml", "dl",
  "c\\. à soupe", "c\\. à café", "cs", "cc",
  "pincées?", "gousses?", "tranches?", "bottes?", "sachets?", "boîtes?", "pots?",
  "paquets?", "bouteilles?", "pièces?", "x",
];
const QTY_RE = new RegExp(
  `^(\\d+(?:[.,]\\d+)?)\\s*(${UNITS.join("|")})?\\.?\\s+(?:d['’]\\s*|de\\s+)?(.+)$`,
  "i"
);

/**
 * Parses text copied from Apple Reminders (one reminder per line).
 * Accepts bullets/checkboxes and the app's own export format
 * ("• 2 kg Pommes (Gratin)"), extracts a leading quantity + unit, and
 * de-duplicates against the current list and within the paste.
 */
export function parseRemindersText(text: string, existing: ShoppingItem[]): ParsedReminder[] {
  const openKeys = new Set(
    existing.filter((i) => !i.checked).map((i) => normalizeIngredientKey(i.name))
  );
  const seen = new Set<string>();
  const out: ParsedReminder[] = [];

  for (const rawLine of text.split(/\r?\n/)) {
    let line = rawLine
      .replace(/^\s*(?:[-*•◦▪︎●○☐☑✓✔]|\[\s?[xX]?\s?\])\s*/, "")
      .replace(/\s*\([^)]*\)\s*$/, "") // trailing "(Recette)" from our own export
      .trim();
    if (!line || /^🛒|^liste de courses/i.test(line)) continue;

    let amount: number | null = null;
    let unit: string | null = null;
    const m = line.match(QTY_RE);
    if (m) {
      amount = Number(m[1].replace(",", "."));
      unit = m[2] && m[2].toLowerCase() !== "x" ? m[2] : null;
      line = m[3].trim();
    }
    const name = line.charAt(0).toUpperCase() + line.slice(1);
    const key = normalizeIngredientKey(name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({ name, amount, unit, duplicate: openKeys.has(key) });
  }
  return out;
}
