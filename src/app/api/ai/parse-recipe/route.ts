import { NextRequest, NextResponse } from "next/server";
import { clampDishBoxAboveTitle } from "@/features/ai/cropBoxes";
import { cleanNutrition } from "@/features/ai/nutrition";
import { callGeminiRace, GeminiError } from "@/lib/gemini";

export const maxDuration = 60;
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

export async function POST(req: NextRequest) {
  const serverLogs: string[] = [];
  const log = (msg: string) => {
    const timestamp = new Date().toISOString().substring(11, 19);
    serverLogs.push(`[${timestamp}] ${msg}`);
  };

  try {
    log("Réception de la requête POST sur /api/ai/parse-recipe");
    const formData = await req.formData();
    const files: File[] = [];

    for (const [key, value] of formData.entries()) {
      if (value instanceof File && value.size > 0) {
        files.push(value);
      }
    }

    log(`${files.length} fichier(s) image(s) reçu(s)`);

    if (files.length === 0) {
      log("ERREUR: Aucun fichier image fourni dans le FormData");
      return NextResponse.json(
        { error: "Aucune photo fournie.", logs: serverLogs },
        { status: 400 }
      );
    }

    files.forEach((f, idx) => {
      const sizeMb = (f.size / (1024 * 1024)).toFixed(2);
      log(`Photo ${idx + 1}: ${f.name || "sans_nom"} (${sizeMb} MB, ${f.type || "image/jpeg"})`);
    });

    const geminiApiKey =
      process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    log(`Clé API Gemini détectée: ${Boolean(geminiApiKey)}`);

    // Convert uploaded images to base64
    const imagesData = await Promise.all(
      files.map(async (f) => {
        const buffer = Buffer.from(await f.arrayBuffer());
        const mimeType = f.type || "image/jpeg";
        return {
          base64: buffer.toString("base64"),
          mimeType,
          dataUrl: `data:${mimeType};base64,${buffer.toString("base64")}`,
        };
      })
    );

    const systemPrompt = `Tu es un chef cuisinier expert et un système de vision OCR ultra-précis spécialisé dans les fiches recettes (HelloFresh, Quitoque, fiches cuisine).

INSTRUCTIONS CRITIQUES :
1. OCR STRICT & FIDÈLE : Lis et extrais TOUT le texte réel visible sur les photos. N'invente JAMAIS de fausses données ni de données par défaut. Si le plat est "Riz sauté aux légumes" ou "Poulet au curry", extrais exactement ce titre, ses ingrédients réels et ses étapes réelles.
2. TRADUCTION OBLIGATOIRE EN FRANÇAIS : Si la fiche recette, le livre ou le texte est en anglais (ou toute autre langue étrangère), TRADUIS TOUT INTÉGRALEMENT EN FRANÇAIS (titre du plat en français, sous-titre en français, noms des ingrédients traduits en français avec unités métriques usuelles, étapes et astuces rédigées en français). Tout le contenu textuel renvoyé doit être 100% en français.
3. DÉTECTION D'ORIENTATION (TRÈS IMPORTANT) :
   - Analyse l'orientation de chaque photo (photo 0, photo 1, etc.).
   - Indique la rotation en degrés (0, 90, 180, ou 270) nécessaire pour que le texte soit parfaitement horizontal, droit et lisible de gauche à droite.
4. DÉTECTION & RECADRAGE DES IMAGES :
   - Sur la photo du plat fini (recto) : Détecte les coordonnées [ymin, xmin, ymax, xmax] (échelle 0 à 1000) de l'assiette/bol ("mainDishCropBox") une fois la photo remise droite.
   - Sur la photo des étapes (verso) : Pour CHAQUE étape numérotée (Étape 1, 2, 3, 4, 5, 6...), identifie avec grande précision le rectangle [ymin, xmin, ymax, xmax] (échelle 0 à 1000) de la photo/illustration de l'étape correspondante ("stepCropBox") une fois la photo remise droite.

5. NUTRITION : ne remplis QUE les valeurs réellement visibles sur les photos (ex. seulement calories et protéines si c'est tout ce qui est affiché). Toute valeur absente vaut null : n'estime et n'invente jamais une valeur nutritionnelle.

6. FORMAT « CAPTURES D'ÉCRAN DE SITE KIT-REPAS » (Quitoque, HelloFresh, Cook... : 1 à plusieurs longues captures verticales de page web, dans n'importe quel ordre) :
   - Une capture peut contenir la photo héros du plat avec le titre incrusté dessus, les infos (Total, Calories, Protéines, Difficulté), la description, les allergènes, les ingrédients, les ustensiles et les valeurs nutritionnelles ; une autre, les « Instructions » avec une grille de photos numérotées sur 2 colonnes. Croise TOUTES les photos pour construire UNE seule recette.
   - Ignore tout le chrome d'interface : bouton « Enregistrer », croix de fermeture, « Origine : UE FR », labels de pays, bandeaux.
   - Difficulté : « Facile » → "Easy", « Intermédiaire » → "Medium", « Difficile » → "Hard". prepTimeMinutes = durée « Total ».
   - Nutrition : prends la colonne « Par portion » (calories en kcal, protéines, glucides, lipides, fibres, sel si présents).
   - Ingrédients : le sélecteur « quantité » (ex. 6) donne le nombre de personnes pour lequel les quantités affichées sont valables → servingsBase = ce nombre. Garde les quantités affichées telles quelles (ex. « 1500 g » → amount 1500, unit "g" ; « 2 sachet(s) » → amount 2, unit "sachet(s)" ; « 1.5 pot(s) »).
   - Section « Non inclus dans la livraison » (bouillon, huile d'olive, poivre et sel...) : ajoute ces éléments dans "ingredients" avec amount 0 et unit "" (« Poivre et sel » → deux ingrédients « Poivre » et « Sel »). Ne les oublie pas.
   - Les étapes contiennent des quantités « par personne » (ex. « ½ cc de thym séché par personne ») : recopie-les dans la description sans les convertir.
   - Étapes : une étape par vignette numérotée ; title = le titre de la vignette (« C'est parti ! », « Au tour des champignons »...), description = ses puces recopiées fidèlement, séparées par des retours à la ligne. stepPhotoIndex = index de la capture qui contient la grille, stepCropBox = rectangle de la PHOTO seule de la vignette (sans le numéro ni le texte en dessous).
   - Photo du plat : frontPhotoIndex = capture qui contient la photo héros ; mainDishCropBox = rectangle du plat dans cette photo, SANS le titre ni le sous-titre incrustés (reste sur l'assiette). Si un titre/sous-titre est incrusté sur la photo, donne aussi son rectangle dans "heroTitleBox" [ymin, xmin, ymax, xmax] (même échelle, même capture) ; sinon null.
   - Les captures sont droites : photoOrientations = 0 pour chacune.

Réponds STRICTEMENT avec un JSON valide respectant cette structure exacte :
{
  "title": "Nom exact du plat extrait par OCR",
  "subtitle": "Sous-titre ou description courte",
  "category": "Main Dishes" | "Soups & Stews" | "Appetizers" | "Pastas" | "Desserts" | "Salads" | "Breakfast" | "Sides",
  "prepTimeMinutes": 35,
  "difficulty": "Easy" | "Medium" | "Hard",
  "servingsBase": 4,
  "spiceLevel": "Épicé" | "Doux" | "Moyen",
  "utensils": ["Wok", "Casserole"],
  "nutrition": {
    "caloriesKcal": null,
    "proteines": null,
    "glucides": null,
    "lipides": null,
    "fibres": null,
    "sel": null
  },
  "allergens": ["Sésame", "Soja"],
  "photoOrientations": [0, 90],
  "frontPhotoIndex": 0,
  "mainDishCropBox": [120, 100, 820, 880],
  "heroTitleBox": null,
  "ingredients": [
    { "id": "ing_1", "name": "Nom exact ingrédient", "amount": 2, "unit": "pièce(s)" }
  ],
  "steps": [
    {
      "stepNumber": 1,
      "title": "Titre exact de l'étape",
      "description": "Instructions détaillées extraites fidèlement",
      "durationMinutes": 10,
      "chefTip": "Astuce si mentionnée",
      "stepPhotoIndex": 1,
      "stepCropBox": [80, 50, 320, 350],
      "imagePrompt": "Detailed English food photography prompt describing the exact visual scene seen in this step photo"
    }
  ]
}`;

    if (!geminiApiKey) {
      return NextResponse.json(
        { error: "Clé API Gemini manquante sur le serveur.", logs: serverLogs },
        { status: 500 }
      );
    }

    const parts: unknown[] = [{ text: systemPrompt }];
    imagesData.forEach((img) => {
      parts.push({ inline_data: { mime_type: img.mimeType, data: img.base64 } });
    });

    try {
      // 2 models race, then fallbacks; always answers before the 60 s hosting limit
      const { parsed, model } = await callGeminiRace({
        apiKey: geminiApiKey,
        models: [
          "gemini-flash-lite-latest",
          "gemini-3.5-flash-lite",
          "gemini-3.5-flash",
          "gemini-3.8-flash",
          "gemini-flash-latest",
        ],
        parts,
        budgetMs: 54_000,
        parallel: 2,
        log,
        accept: (p) => {
          if (!p || typeof p.title !== "string") throw new Error("JSON sans titre");
        },
      });
      parsed.mainDishCropBox =
        clampDishBoxAboveTitle(parsed.mainDishCropBox, parsed.heroTitleBox) ?? parsed.mainDishCropBox;
      parsed.nutrition = cleanNutrition(parsed.nutrition);
      log(
        `Succès OCR Gemini (${model}) : Plat "${parsed.title}" avec ${parsed.ingredients?.length || 0} ingrédients et ${parsed.steps?.length || 0} étapes.`
      );
      return NextResponse.json({
        recipe: parsed,
        logs: serverLogs,
        provider: `Google Gemini Vision (${model})`,
      });
    } catch (err: any) {
      // No mock/fake data fallback: return an honest, readable error
      log(`ÉCHEC : ${err?.message || err}`);
      return NextResponse.json(
        {
          error:
            err instanceof GeminiError
              ? err.message
              : "L'analyse visuelle par IA a échoué. Vérifiez la lisibilité des photos.",
          logs: serverLogs,
        },
        { status: err instanceof GeminiError && err.kind !== "failed" ? 503 : 502 }
      );
    }
  } catch (err: any) {
    log(`FATAL API ERROR: ${err?.message || err}`);
    return NextResponse.json(
      { error: err?.message || "Erreur interne de traitement", logs: serverLogs },
      { status: 500 }
    );
  }
}
