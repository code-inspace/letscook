/**
 * Canonical ingredient identity, shared by the ingredient catalog (DB), the
 * shopping list aggregation and the autocomplete. Every new recipe, import or
 * manual item goes through it, so merges are deterministic and persist.
 *
 * "2 gousses d'ail", "Ail", "c. à soupe de thym", "Thym frais", "Purée de
 * gingembre", "Gingembre", "Bouillons cubes légumes", "Bouillon de légumes"
 * collapse to one ingredient: quantities, measures, forms and articles are
 * stripped, plurals and accents ignored.
 */

const stripAccents = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");

// Written without accents: matched against the unaccented name, applied repeatedly at the start
const LEADING_PATTERNS: RegExp[] = [
  /^[+\d½¼¾⅓⅔.,/\s-]+/, // quantities: "2", "1,5", "½", "+ 2"
  /^(environ|env\.?|et|ou|\+)\s+/,
  /^(kg|g|gr|grammes?|mg|l|cl|ml|dl|litres?)\.?\s+/,
  /^(c\.?|cuilleres?|cuil\.?)\s*a\s*(soupe|cafe|the)\s*/,
  /^a\s*(soupe|cafe)\s*/, // broken OCR: "à soupe de thym"
  /^(cs|cc|cas|cac|tbsp|tsp)\.?\s+/,
  /^(gousses?|pincees?|tranches?|brins?|bottes?|bouquets?|sachets?|cubes?|tablettes?|boites?|pots?|briques?|paquets?|barquettes?|poignees?|morceaux?|zestes?|tetes?|tiges?|feuilles?|branches?)\s+/,
  /^puree\s+(?=(de|d')\s?)/, // "purée de gingembre" → gingembre (not "concentré de tomate")
  // Articles: a whole word followed by a space, or an elided form ("d'", "l'")
  /^(un|une|des|du|de la|de|la|le|les)\s+/,
  /^(de l'|d'|l')\s*/,
];

// Products whose descriptor IS the product (never strip it)
const PROTECTED =
  /\b(creme fraiche|creme liquide|fromage frais|tomates? sechees?|fruits? secs?|lait en poudre|levure fraiche|petits? pois)\b/;

// Form / preparation words: not a different product to buy
const DESCRIPTORS =
  /\b(frais|fraiche?s?|hachee?s?|emincee?s?|ciselee?s?|rapee?s?|moulue?s?|sechee?s?|en poudre|en cubes?|cubes?|surgelee?s?|entiere?s?|bio|nature|deshydratee?s?|en puree|liquide|instantanee?)\b/g;

const STOPWORDS = new Set(["de", "d", "du", "des", "la", "le", "les", "l", "a", "au", "aux", "en", "et", "pour", "avec"]);

/** Cuts `count` leading chars measured on the unaccented string (same length as original). */
function normalizeForMatch(s: string) {
  // Ligatures keep the same length as the original so positions still line up: œ → o, æ → a
  return stripAccents(s.toLowerCase()).replace(/[’]/g, "'").replace(/œ/g, "o").replace(/æ/g, "a");
}

/** Readable name without quantity/measure/form: "2 gousses d'ail" → "ail". Keeps accents. */
export function ingredientLabel(name: string): string {
  if (!name) return "";
  // NFC so the unaccented copy has the same length as the original
  let s = name
    .normalize("NFC")
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ") // "(Contient : Gluten…)", "(env. 200 g)"
    .replace(/[’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();

  for (let pass = 0; pass < 5; pass++) {
    const before = s;
    for (const re of LEADING_PATTERNS) {
      const m = normalizeForMatch(s).match(re);
      if (m && m.index === 0 && m[0].length > 0) s = s.slice(m[0].length).trim();
    }
    if (s === before) break;
  }

  // Remove descriptors by position found on the unaccented copy
  const plain = normalizeForMatch(s);
  if (!PROTECTED.test(plain)) {
    let out = "";
    let last = 0;
    for (const m of plain.matchAll(DESCRIPTORS)) {
      out += s.slice(last, m.index);
      last = (m.index ?? 0) + m[0].length;
    }
    s = (out + s.slice(last)).replace(/\s+/g, " ").trim();
  }
  // Dangling connector left by a removed word: "gingembre en" → "gingembre"
  s = s.replace(/\s+(de|d'|du|des|en|et)$/, "").trim();
  return s || name.trim().toLowerCase();
}

// Words ending in s/x that are not plurals
const INVARIABLE = new Set([
  "paris", "mais", "radis", "anis", "pois", "noix", "jus", "ananas", "cassis", "couscous",
  "brebis", "panais", "riz", "gris", "frais", "doux", "roux", "bois", "lys",
]);

function singular(word: string): string {
  if (word.length <= 3 || INVARIABLE.has(word)) return word;
  if (word.endsWith("eaux")) return word.slice(0, -1); // poireaux → poireau
  if (/[sx]$/.test(word)) return word.slice(0, -1);
  return word;
}

/**
 * Varieties merged into their generic ingredient (key → key). Add entries here to
 * merge more: rules can't guess that "champignon de Paris" = champignon while
 * "pomme de terre" ≠ pomme.
 */
const ALIASES: Record<string, string> = {
  "champignon paris": "champignon",
  "champignon blanc": "champignon",
  "bouillon legume": "bouillon legume",
  "bouillon cube": "bouillon legume",
  "cube bouillon": "bouillon legume",
  "cube bouillon legume": "bouillon legume",
  "fond legume": "bouillon legume",
  "oignon jaune": "oignon",
  "ail rose": "ail",
  "huile olive vierge extra": "huile olive",
  "sel fin": "sel",
  "poivre noir": "poivre",
  "poivre noir moulu": "poivre",
};

function rawKey(name: string): string {
  return stripAccents(ingredientLabel(name).toLowerCase())
    .replace(/[’]/g, "'")
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .split(/[^a-z0-9]+/)
    .filter((w) => w && !STOPWORDS.has(w))
    .map(singular)
    .join(" ")
    .trim();
}

/** Comparison key: "Bouillons cubes légumes" and "bouillon de légumes" → "bouillon legume". */
export function ingredientKey(name: string): string {
  const key = rawKey(name);
  return ALIASES[key] ?? key;
}

/** Stable catalog id: "ing_bouillon_legume" */
export function ingredientId(name: string): string {
  return `ing_${ingredientKey(name).replace(/\s+/g, "_")}`;
}

/** Display name for the catalog / shopping list: "Ail", "Bouillon de légumes". */
export function ingredientDisplayName(name: string): string {
  const label = ingredientLabel(name);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/**
 * Among names of the same ingredient, the best display name: prefer a name that
 * was already clean as written ("Bouillon de légumes" over the "Bouillon légumes"
 * left from "Bouillon cube légumes"), then the shortest.
 */
export function pickDisplayName(names: string[]): string {
  const candidates = names
    .filter(Boolean)
    .map((n) => {
      const label = ingredientDisplayName(n);
      const asWritten = n.trim().replace(/\s+/g, " ");
      return { label, clean: label.toLowerCase() === asWritten.toLowerCase() };
    })
    .filter((c) => c.label);
  candidates.sort(
    (a, b) => Number(b.clean) - Number(a.clean) || a.label.length - b.label.length || a.label.localeCompare(b.label)
  );
  return candidates[0]?.label || "";
}

// ---- Quantities -------------------------------------------------------------

export interface Quantity {
  amount: number;
  unit: string;
}

/** Normalised unit + factor to a base unit (kg → g ×1000, L → ml ×1000…). */
function unitInfo(unit: string | null | undefined): { key: string; label: string; factor: number } {
  const raw = (unit || "").trim();
  const u = normalizeForMatch(raw).replace(/\(s\)/g, "").replace(/\.$/, "").trim();
  if (!u) return { key: "", label: "", factor: 1 };
  if (/^(g|gr|grammes?)$/.test(u)) return { key: "g", label: "g", factor: 1 };
  if (/^(kg|kilos?|kilogrammes?)$/.test(u)) return { key: "g", label: "g", factor: 1000 };
  if (/^mg$/.test(u)) return { key: "g", label: "g", factor: 0.001 };
  if (/^(ml|millilitres?)$/.test(u)) return { key: "ml", label: "ml", factor: 1 };
  if (/^(cl|centilitres?)$/.test(u)) return { key: "ml", label: "ml", factor: 10 };
  if (/^dl$/.test(u)) return { key: "ml", label: "ml", factor: 100 };
  if (/^(l|litres?)$/.test(u)) return { key: "ml", label: "ml", factor: 1000 };
  if (/^(c\.? ?a soupe|cuilleres? a soupe|cs|cas|tbsp)$/.test(u)) return { key: "cs", label: "c. à soupe", factor: 1 };
  if (/^(c\.? ?a cafe|cuilleres? a cafe|cc|cac|tsp)$/.test(u)) return { key: "cc", label: "c. à café", factor: 1 };
  // Countables ("pièce(s)", "gousses", "sachet") share a key regardless of plural
  return { key: u.replace(/s$/, ""), label: raw, factor: 1 };
}

/**
 * Sums quantities per unit family: 500 g + 1 kg → 1,5 kg; 2 gousses + 10 g stay
 * separate (never "12 gousses").
 */
export function sumQuantities(items: Array<{ amount?: number | null; unit?: string | null }>): Quantity[] {
  const byUnit = new Map<string, Quantity>();
  for (const it of items) {
    if (typeof it.amount !== "number" || !(it.amount > 0)) continue;
    const info = unitInfo(it.unit);
    const amount = it.amount * info.factor;
    const prev = byUnit.get(info.key);
    if (prev) prev.amount += amount;
    else byUnit.set(info.key, { amount, unit: info.label });
  }
  return Array.from(byUnit.values()).map((q) => {
    if (q.unit === "g" && q.amount >= 1000) return { amount: round(q.amount / 1000), unit: "kg" };
    if (q.unit === "ml" && q.amount >= 1000) return { amount: round(q.amount / 1000), unit: "L" };
    return { amount: round(q.amount), unit: q.unit };
  });
}

const round = (n: number) => Math.round(n * 100) / 100;

/** "2 gousse(s) + 10 g" */
export function formatQuantities(quantities: Quantity[]): string {
  return quantities
    .map((q) => [String(q.amount).replace(".", ","), q.unit].filter(Boolean).join(" "))
    .join(" + ");
}
