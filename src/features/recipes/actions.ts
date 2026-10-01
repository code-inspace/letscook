import { Recipe } from "./types";
import { encryptText, decryptText, isEncrypted } from "@/lib/crypto/encryption";
import { createClient } from "@/utils/supabase/client";

const RECIPES_STORAGE_KEY_PREFIX = "letscook_recipes_";

export const INITIAL_SEED_RECIPES: Recipe[] = [
  {
    id: "rec-miso-ramen",
    userId: "user-default-1",
    title: "Miso Ramen",
    subtitle: "Ramen traditionnel au bouillon miso riche & tofu doré",
    category: "Soups & Stews",
    imageUrl: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&auto=format&fit=crop&q=80",
    prepTimeMinutes: 20,
    difficulty: "Easy",
    rating: 5.0,
    servingsBase: 2,
    spiceLevel: "Doux",
    utensils: ["Casserole", "Passoire", "Bol à ramen", "Baguettes"],
    nutrition: {
      caloriesKcal: 520,
      proteines: "22g",
      glucides: "64g",
      lipides: "18g",
      fibres: "6g",
      sel: "2.8g",
    },
    allergens: ["Soja", "Sésame", "Gluten", "Œuf"],
    ingredients: [
      { id: "ing-1", name: "Egg", amount: 2, unit: "pcs", imageUrl: "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=100&auto=format&fit=crop&q=80" },
      { id: "ing-2", name: "Chicken meat", amount: 250, unit: "g", imageUrl: "https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=100&auto=format&fit=crop&q=80" },
      { id: "ing-3", name: "Broccoli", amount: 150, unit: "g", imageUrl: "https://images.unsplash.com/photo-1584270354949-c26b0d5b4a0c?w=100&auto=format&fit=crop&q=80" },
      { id: "ing-4", name: "Ramen Noodles", amount: 200, unit: "g", imageUrl: "https://images.unsplash.com/photo-1612927601601-6638404737ce?w=100&auto=format&fit=crop&q=80" },
      { id: "ing-5", name: "Miso Paste", amount: 3, unit: "tbsp", imageUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100&auto=format&fit=crop&q=80" },
      { id: "ing-6", name: "Mushrooms", amount: 100, unit: "g", imageUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=100&auto=format&fit=crop&q=80" },
      { id: "ing-7", name: "Spring Onion", amount: 2, unit: "tiges", imageUrl: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=100&auto=format&fit=crop&q=80" },
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Cutting Mushrooms & Veggies",
        description: "Slice the mushrooms thinly from top to bottom. Make sure each slice is the same thickness so they cook evenly. Émincez finement les oignons nouveaux.",
        imageUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&auto=format&fit=crop&q=80",
        durationMinutes: 5,
        chefTip: "Gardez les tiges vertes d'oignons pour le dressage final !",
      },
      {
        stepNumber: 2,
        title: "Cuisson du bouillon Miso",
        description: "Faites chauffer 600ml d'eau dans une casserole. Délayez la pâte miso à feu doux sans faire bouillir à gros bouillons pour préserver les arômes.",
        imageUrl: "https://images.unsplash.com/photo-1547592180-85f173990554?w=600&auto=format&fit=crop&q=80",
        durationMinutes: 7,
      },
      {
        stepNumber: 3,
        title: "Cuisson des nouilles et œufs",
        description: "Plongez les nouilles ramen dans de l'eau bouillante salée pendant 3 minutes. Faites cuire les œufs mollets 6 minutes puis plongez-les dans l'eau glacée.",
        imageUrl: "https://images.unsplash.com/photo-1612927601601-6638404737ce?w=600&auto=format&fit=crop&q=80",
        durationMinutes: 6,
      },
      {
        stepNumber: 4,
        title: "Dressage & Dégustation",
        description: "Répartissez les nouilles dans de grands bols. Versez le bouillon fumant. Disposez le poulet doré, les champignons, le demi-œuf mollet et parsemez de sésame.",
        imageUrl: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&auto=format&fit=crop&q=80",
        durationMinutes: 2,
      },
    ],
    isFavorite: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "rec-porc-hache-japonais",
    userId: "user-default-1",
    title: "Porc haché, riz & navet glacé à la japonaise",
    subtitle: "avec une sauce soja-sésame & du citron",
    category: "Main Dishes",
    imageUrl: "https://images.unsplash.com/photo-1552611052-33e04de081de?w=600&auto=format&fit=crop&q=80",
    prepTimeMinutes: 40,
    difficulty: "Medium",
    rating: 4.9,
    servingsBase: 6,
    spiceLevel: "Épicé",
    utensils: ["Bol", "Sauteuse avec couvercle", "Râpe", "Casserole avec couvercle", "Éplucheur", "Spatule", "Passoire"],
    nutrition: {
      caloriesKcal: 830,
      proteines: "26g",
      glucides: "83g",
      lipides: "45g",
      fibres: "7g",
      sel: "3.6g",
    },
    allergens: ["Soja", "Sésame"],
    ingredients: [
      { id: "ing-p1", name: "Navet", amount: 4, unit: "pièce(s)", imageUrl: "https://images.unsplash.com/photo-1590165482129-1b8b27698780?w=100&auto=format&fit=crop&q=80" },
      { id: "ing-p2", name: "Carotte", amount: 3, unit: "pièce(s)", imageUrl: "https://images.unsplash.com/photo-1598170845058-32b9d6a5c317?w=100&auto=format&fit=crop&q=80" },
      { id: "ing-p3", name: "Gousse d'ail", amount: 2, unit: "pièce(s)" },
      { id: "ing-p4", name: "Oignon nouveau", amount: 100, unit: "g" },
      { id: "ing-p5", name: "Gingembre frais", amount: 2, unit: "cm" },
      { id: "ing-p6", name: "Riz", amount: 450, unit: "g" },
      { id: "ing-p7", name: "Farce au porc", amount: 2, unit: "paquet(s)" },
      { id: "ing-p8", name: "Citron", amount: 1.5, unit: "pièce(s)" },
      { id: "ing-p9", name: "Sauce soja", amount: 1.5, unit: "sachet(s)" },
      { id: "ing-p10", name: "Huile de sésame", amount: 1.5, unit: "sachet(s)" },
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Coupe, tranche, cisèle !",
        description: "Épluchez le navet et coupez-le en quartiers de 1 cm de côté. Épluchez la carotte et coupez-la en 8 longs bâtonnets. Ciselez finement l'ail ainsi que le blanc et le vert de l'oignon nouveau séparément. Râpez le gingembre.",
        imageUrl: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=600&auto=format&fit=crop&q=80",
        durationMinutes: 10,
      },
      {
        stepNumber: 2,
        title: "La sauteuse en action",
        description: "Dans une grande sauteuse, faites fondre une noix de beurre à feu moyen-vif. Ajoutez-y le navet et la carotte et faites-les colorer 5 min. Saupoudrez le sucre et faites caraméliser 3 min. Mouillez à hauteur, couvrez et faites cuire 14-18 min jusqu'à ce que les légumes soient fondants.",
        imageUrl: "https://images.unsplash.com/photo-1547592180-85f173990554?w=600&auto=format&fit=crop&q=80",
        durationMinutes: 18,
        chefTip: "Vérifiez la cuisson des légumes avec la pointe d'un couteau.",
      },
      {
        stepNumber: 3,
        title: "Le riz passe à la casserole",
        description: "Pendant ce temps, portez une casserole d'eau salée à ébullition. Faites-y cuire le riz 12-14 min, ou jusqu'à ce qu'il soit tendre. Égouttez-le, ajoutez-y une petite noix de beurre et réservez-le à couvert.",
        imageUrl: "https://images.unsplash.com/photo-1516714435131-44d6b64dc6a2?w=600&auto=format&fit=crop&q=80",
        durationMinutes: 14,
      },
      {
        stepNumber: 4,
        title: "Au tour de la viande",
        description: "Faites chauffer un filet d'huile de tournesol dans un wok ou une sauteuse à feu moyen-vif. Faites-y dorer l'ail et la farce au porc 4-5 min en émiettant la viande avec une spatule. Ajoutez le blanc de l'oignon nouveau et faites cuire de nouveau 2-3 min.",
        imageUrl: "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80",
        durationMinutes: 8,
      },
      {
        stepNumber: 5,
        title: "Pause fraîcheur",
        description: "En attendant, coupez le citron en quartiers. Dans un bol, pressez le jus de 1/4 citron par personne et mélangez une pincée de gingembre, la sauce soja, l'huile de sésame, un filet de vinaigre de riz et 1/2 cc de sucre par personne. Ajoutez la moitié dans la poêle des légumes et le reste dans la viande.",
        imageUrl: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&auto=format&fit=crop&q=80",
        durationMinutes: 4,
      },
      {
        stepNumber: 6,
        title: "Dressage en vue",
        description: "Répartissez le riz dans des assiettes creuses. Présentez les légumes caramélisés par-dessus, puis ajoutez-y le porc. Parsemez le tout du vert de l'oignon nouveau. À vos fourchettes !",
        imageUrl: "https://images.unsplash.com/photo-1552611052-33e04de081de?w=600&auto=format&fit=crop&q=80",
        durationMinutes: 2,
      },
    ],
    isFavorite: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "rec-mijote-dinde-curry",
    userId: "user-default-1",
    title: "Mijoté vivifiant de dinde au curry",
    subtitle: "garni de lait de coco & patate douce",
    category: "Soups & Stews",
    imageUrl: "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=600&auto=format&fit=crop&q=80",
    prepTimeMinutes: 50,
    difficulty: "Easy",
    rating: 4.8,
    servingsBase: 6,
    spiceLevel: "Épicé",
    utensils: ["Râpe", "Casserole", "Éplucheur"],
    nutrition: {
      caloriesKcal: 635,
      proteines: "31g",
      glucides: "53g",
      lipides: "33g",
      fibres: "10g",
      sel: "8.6g",
    },
    allergens: ["Poisson"],
    ingredients: [
      { id: "ing-d1", name: "Oignon", amount: 3, unit: "pièce(s)" },
      { id: "ing-d2", name: "Gousse d'ail", amount: 4, unit: "pièce(s)" },
      { id: "ing-d3", name: "Gingembre frais", amount: 2, unit: "cm" },
      { id: "ing-d4", name: "Oignon nouveau", amount: 100, unit: "g" },
      { id: "ing-d5", name: "Patate douce", amount: 2, unit: "pièce(s)" },
      { id: "ing-d6", name: "Carotte", amount: 3, unit: "pièce(s)" },
      { id: "ing-d7", name: "Dés de filet de dinde", amount: 2, unit: "paquet(s)" },
      { id: "ing-d8", name: "Curry jaune", amount: 1.5, unit: "sachet(s)" },
      { id: "ing-d9", name: "Lait de coco", amount: 2, unit: "paquet(s)" },
      { id: "ing-d10", name: "Sauce poisson", amount: 1.5, unit: "sachet(s)" },
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Légumes à la chaîne !",
        description: "Préparez le bouillon avec de l'eau chaude. Ciselez finement l'oignon. Ciselez l'ail ou râpez-le. Râpez le gingembre. Ciselez séparément le blanc et le vert de l'oignon nouveau. Épluchez la patate douce et la carotte. Coupez la patate douce en dés de 1.5 cm et la carotte en demi-lunes.",
        imageUrl: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop&q=80",
        durationMinutes: 12,
      },
      {
        stepNumber: 2,
        title: "Chauffer les casseroles !",
        description: "Faites chauffer un filet d'huile de tournesol dans une grande casserole ou marmite à feu vif. Faites-y revenir la dinde 2-3 min jusqu'à ce qu'elle soit bien colorée. Réservez-la. Ajoutez le blanc de l'oignon, la carotte, le gingembre, l'ail et le curry jaune. Faites revenir 3-5 min.",
        imageUrl: "https://images.unsplash.com/photo-1547592180-85f173990554?w=600&auto=format&fit=crop&q=80",
        durationMinutes: 8,
      },
      {
        stepNumber: 3,
        title: "Ça mijote !",
        description: "Secouez le lait de coco. Déglacez avec un peu de vinaigre balsamique blanc. Ajoutez la patate douce, le bouillon, la sauce poisson et le lait de coco. Portez à ébullition puis laissez mijoter 20-22 min à feu moyen jusqu'à ce que la patate douce soit cuite.",
        imageUrl: "https://images.unsplash.com/photo-1588168333986-5078d3ae3976?w=600&auto=format&fit=crop&q=80",
        durationMinutes: 22,
      },
      {
        stepNumber: 4,
        title: "Sur la route des saveurs",
        description: "Lorsqu'il reste 2-3 min de cuisson, remettez la dinde dans la casserole. Rectifiez l'assaisonnement en sel et poivre. Servez le mijoté dans des assiettes creuses et parsemez de vert d'oignon nouveau.",
        imageUrl: "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=600&auto=format&fit=crop&q=80",
        durationMinutes: 4,
      },
    ],
    isFavorite: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export function getStoredRecipes(userId?: string): Recipe[] {
  const targetId = userId || "user-default-1";
  if (typeof window === "undefined") return INITIAL_SEED_RECIPES;

  try {
    const raw = localStorage.getItem(`${RECIPES_STORAGE_KEY_PREFIX}${targetId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}

  // Initialize with seed recipes if none exist
  saveStoredRecipes(INITIAL_SEED_RECIPES, targetId);
  return INITIAL_SEED_RECIPES;
}

export function saveStoredRecipes(recipes: Recipe[], userId?: string): void {
  const targetId = userId || "user-default-1";
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      `${RECIPES_STORAGE_KEY_PREFIX}${targetId}`,
      JSON.stringify(recipes)
    );
    window.dispatchEvent(new CustomEvent("letscook:recipes-updated"));
  } catch (err) {
    console.warn("saveStoredRecipes error:", err);
  }
}

export async function fetchRecipesFromDb(userId?: string): Promise<Recipe[]> {
  const targetId = userId || "user-default-1";
  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from("recipes")
      .select("*")
      .eq("user_id", targetId)
      .order("created_at", { ascending: false });

    if (!error && data && data.length > 0) {
      const decryptedRecipes: Recipe[] = [];
      for (const row of data) {
        let title = row.title;
        let ingredients = row.ingredients;
        let steps = row.steps;

        if (title && isEncrypted(title)) title = await decryptText(title);
        if (typeof ingredients === "string" && isEncrypted(ingredients)) {
          const dec = await decryptText(ingredients);
          try { ingredients = JSON.parse(dec); } catch {}
        }
        if (typeof steps === "string" && isEncrypted(steps)) {
          const dec = await decryptText(steps);
          try { steps = JSON.parse(dec); } catch {}
        }

        decryptedRecipes.push({
          id: row.id,
          userId: row.user_id,
          title: title || "Recette sans titre",
          subtitle: row.subtitle,
          category: row.category || "Main Dishes",
          imageUrl: row.image_url || "",
          prepTimeMinutes: row.prep_time_minutes || 30,
          difficulty: row.difficulty || "Easy",
          rating: row.rating || 5.0,
          servingsBase: row.servings_base || 4,
          spiceLevel: row.spice_level,
          utensils: row.utensils || [],
          nutrition: row.nutrition,
          allergens: row.allergens || [],
          ingredients: Array.isArray(ingredients) ? ingredients : [],
          steps: Array.isArray(steps) ? steps : [],
          isFavorite: Boolean(row.is_favorite),
          createdAt: row.created_at || new Date().toISOString(),
          updatedAt: row.updated_at || new Date().toISOString(),
        });
      }
      saveStoredRecipes(decryptedRecipes, targetId);
      return decryptedRecipes;
    }
  } catch (err) {
    console.warn("fetchRecipesFromDb error, falling back to local:", err);
  }

  return getStoredRecipes(targetId);
}

export async function saveRecipeToDb(recipe: Recipe, userId?: string): Promise<Recipe> {
  const targetId = userId || recipe.userId || "user-default-1";
  const supabase = createClient();

  // 1. Instant local sync
  const current = getStoredRecipes(targetId);
  const existingIdx = current.findIndex((r) => r.id === recipe.id);
  const updatedList = existingIdx >= 0
    ? current.map((r) => (r.id === recipe.id ? recipe : r))
    : [recipe, ...current];
  saveStoredRecipes(updatedList, targetId);

  // 2. Encrypted Supabase Upsert
  try {
    const encryptedTitle = await encryptText(recipe.title);
    const encryptedIngredients = await encryptText(JSON.stringify(recipe.ingredients));
    const encryptedSteps = await encryptText(JSON.stringify(recipe.steps));

    const payload = {
      id: recipe.id,
      user_id: targetId,
      title: encryptedTitle,
      subtitle: recipe.subtitle,
      category: recipe.category,
      image_url: recipe.imageUrl,
      prep_time_minutes: recipe.prepTimeMinutes,
      difficulty: recipe.difficulty,
      rating: recipe.rating,
      servings_base: recipe.servingsBase,
      spice_level: recipe.spiceLevel,
      utensils: recipe.utensils,
      nutrition: recipe.nutrition,
      allergens: recipe.allergens,
      ingredients: encryptedIngredients,
      steps: encryptedSteps,
      is_favorite: Boolean(recipe.isFavorite),
      updated_at: new Date().toISOString(),
    };

    await supabase.from("recipes").upsert([payload], { onConflict: "id" });
  } catch (err) {
    console.warn("saveRecipeToDb Supabase sync error:", err);
  }

  return recipe;
}
