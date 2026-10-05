/**
 * Intelligently categorizes food items into supermarket aisles / departments
 */
export function categorizeIngredient(name: string): string {
  if (!name) return "Articles divers";
  const n = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // 1. Fruits & Légumes
  if (
    /tomate|oignon|ail|echalote|poireau|carotte|pomme de terre|patate|courgette|aubergine|poivron|champignon|salade|avocat|citron|pomme|banane|fraise|herbe|coriandre|persil|basilic|gingembre|epina|brocoli|chou|concombre|radis|haricot vert|citrouille|potiron|butternut|legume|fruit|agrume|mache|roquette|ciboulette|menthe|thym|romarin|aneth/.test(
      n
    )
  ) {
    return "Fruits & Légumes";
  }

  // 2. Viandes & Poissons
  if (
    /poulet|boeuf|porc|veau|dinde|steak|saumon|thon|crevette|cabillaud|poisson|bacon|jambon|lard|viande|canard|agneau|saucisse|merguez|hache|moule|crustace|dorade|bar|lieu|eglefin/.test(
      n
    )
  ) {
    return "Viandes & Poissons";
  }

  // 3. Produits Frais & Crèmerie
  if (
    /lait|creme|beurre|fromage|parmesan|mozzarella|yaourt|oeuf|chevre|gruyere|feta|emmental|ricotta|mascarpone|creme fraiche|fromage blanc|creme liquide/.test(
      n
    )
  ) {
    return "Produits Frais & Crèmerie";
  }

  // 4. Épicerie & Féculents
  if (
    /riz|pate|spaghetti|nouille|penne|tagliatelle|farine|sucre|huile|sel|poivre|epice|curry|paprika|sauce|soja|moutarde|vinaigre|bouillon|conserve|levure|chocolat|miel|couscous|quinoa|lentille|pois chiche|mais|ketchup|mayonnaise|sesame/.test(
      n
    )
  ) {
    return "Épicerie & Condiments";
  }

  // 5. Boulangerie
  if (/pain|baguette|tortilla|brioche|wrap|pita|bun|toast/.test(n)) {
    return "Boulangerie";
  }

  // 6. Boissons
  if (/eau|jus|vin|biere|cidre|the|cafe|infusion|soda/.test(n)) {
    return "Boissons";
  }

  return "Articles divers";
}

export const CATEGORY_ICONS: Record<string, string> = {
  "Fruits & Légumes": "🥦",
  "Viandes & Poissons": "🥩",
  "Produits Frais & Crèmerie": "🧀",
  "Épicerie & Condiments": "🌾",
  "Boulangerie": "🥖",
  "Boissons": "🧃",
  "Articles divers": "📦",
};
