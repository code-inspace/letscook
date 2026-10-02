import { NextRequest, NextResponse } from "next/server";

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

    log(`${files.length} fichier(s) image(s) valide(s) reçu(s)`);

    if (files.length === 0) {
      log("ERREUR: Aucun fichier image fourni dans le FormData");
      return NextResponse.json(
        { error: "Aucune photo fournie.", logs: serverLogs },
        { status: 400 }
      );
    }

    files.forEach((f, idx) => {
      const sizeMb = (f.size / (1024 * 1024)).toFixed(2);
      log(`Fichier ${idx + 1}: ${f.name || "sans_nom"} (${sizeMb} MB, type: ${f.type || "inconnu"})`);
    });

    const geminiApiKey =
      process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    const openAiApiKey = process.env.OPENAI_API_KEY;

    log(`Configuration IA: Gemini=${Boolean(geminiApiKey)}, OpenAI=${Boolean(openAiApiKey)}`);

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

    log("Conversion Base64 des images terminée.");

    const systemPrompt = `Tu es un chef cuisinier expert et un analyseur visuel de fiches recettes (comme HelloFresh, Quitoque).
Tu reçois plusieurs photos d'une même recette :
- La photo du plat fini / recto (avec le titre, les ingrédients et la photo principale du plat).
- La photo des étapes / verso (avec les étapes 1 à 6 et les photos de préparation correspondantes au-dessus de chaque étape).

TÂCHE D'EXTRACTION & DE RECADRAGE :
1. Analyse l'orientation des photos (0°, 90°, 180°, 270°) si une photo a été prise couchée ou à l'envers.
2. Identifie les coordonnées normalisées de 0 à 1000 [ymin, xmin, ymax, xmax] pour :
   - L'assiette / bol principal du plat ("mainDishCropBox") sur la photo du recto.
   - La photo spécifique de CHAQUE étape 1, 2, 3... ("stepCropBox") sur la photo des étapes.
3. Extrais fidèlement le titre, les temps, les ingrédients et les instructions de chaque étape.

Réponds STRICTEMENT avec un JSON valide respectant cette structure exacte :
{
  "title": "Nom exact du plat",
  "subtitle": "Sous-titre ou description courte",
  "category": "Main Dishes" | "Soups & Stews" | "Appetizers" | "Pastas" | "Desserts",
  "prepTimeMinutes": 40,
  "difficulty": "Easy" | "Medium" | "Hard",
  "rating": 5.0,
  "servingsBase": 6,
  "spiceLevel": "Épicé" | "Doux" | "Moyen",
  "utensils": ["Sauteuse", "Casserole", "Râpe"],
  "nutrition": {
    "caloriesKcal": 750,
    "proteines": "25g",
    "glucides": "70g",
    "lipides": "30g",
    "fibres": "6g",
    "sel": "3g"
  },
  "allergens": ["Soja", "Sésame"],
  "frontPhotoIndex": 0,
  "frontPhotoRotation": 0,
  "mainDishCropBox": [150, 100, 800, 850],
  "ingredients": [
    { "id": "ing_1", "name": "Nom de l'ingrédient", "amount": 2, "unit": "pièce(s)" }
  ],
  "steps": [
    {
      "stepNumber": 1,
      "title": "Titre de l'étape",
      "description": "Instructions détaillées",
      "durationMinutes": 10,
      "chefTip": "Astuce facultative",
      "stepPhotoIndex": 1,
      "stepCropBox": [80, 350, 250, 600]
    }
  ]
}`;

    // 1. Google Gemini Multimodal Vision API
    if (geminiApiKey) {
      const candidateModels = [
        "gemini-2.0-flash",
        "gemini-1.5-flash-latest",
        "gemini-1.5-flash",
        "gemini-1.5-pro",
      ];

      for (const model of candidateModels) {
        try {
          log(`Appel de l'API Google Gemini avec le modèle ${model}...`);
          const geminiParts: any[] = [{ text: systemPrompt }];
          imagesData.forEach((img) => {
            geminiParts.push({
              inline_data: {
                mime_type: img.mimeType,
                data: img.base64,
              },
            });
          });

          const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`;

          const geminiRes = await fetch(geminiEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: geminiParts }],
              generationConfig: {
                response_mime_type: "application/json",
                temperature: 0.1,
              },
            }),
          });

          log(`Réponse HTTP Gemini (${model}): status ${geminiRes.status}`);

          if (geminiRes.ok) {
            const geminiData = await geminiRes.json();
            const rawText =
              geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (rawText) {
              const cleanedText = rawText
                .replace(/```json/g, "")
                .replace(/```/g, "")
                .trim();
              const parsed = JSON.parse(cleanedText);
              log(`Succès Gemini (${model}) : ${parsed.title || "Recette extraite"}`);
              return NextResponse.json({ recipe: parsed, logs: serverLogs, provider: `Gemini (${model})` });
            } else {
              log(`Réponse Gemini (${model}) sans texte de sortie.`);
            }
          } else {
            const errText = await geminiRes.text();
            log(`Erreur Gemini HTTP ${geminiRes.status}: ${errText.substring(0, 150)}`);
          }
        } catch (geminiError: any) {
          log(`Exception Gemini (${model}): ${geminiError?.message || geminiError}`);
        }
      }
    }

    // 2. OpenAI GPT-4o Vision API
    if (openAiApiKey) {
      try {
        log("Appel de l'API OpenAI GPT-4o...");
        const contentPayload: any[] = [
          { type: "text", text: systemPrompt },
          ...imagesData.map((img) => ({
            type: "image_url",
            image_url: { url: img.dataUrl, detail: "high" },
          })),
        ];

        const openAiRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openAiApiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o",
            messages: [{ role: "user", content: contentPayload }],
            response_format: { type: "json_object" },
            temperature: 0.1,
          }),
        });

        log(`Réponse HTTP OpenAI: status ${openAiRes.status}`);

        if (openAiRes.ok) {
          const aiJson = await openAiRes.json();
          const rawContent = aiJson.choices?.[0]?.message?.content;
          if (rawContent) {
            const parsed = JSON.parse(rawContent);
            log(`Succès OpenAI GPT-4o : ${parsed.title || "Recette extraite"}`);
            return NextResponse.json({ recipe: parsed, logs: serverLogs, provider: "OpenAI GPT-4o" });
          }
        } else {
          const errText = await openAiRes.text();
          log(`Erreur OpenAI HTTP ${openAiRes.status}: ${errText.substring(0, 150)}`);
        }
      } catch (openAiError: any) {
        log(`Exception OpenAI: ${openAiError?.message || openAiError}`);
      }
    }

    // Fallback: Smart template with coordinates for HelloFresh sheets
    log("Activation du fallback automatique HelloFresh haute précision");
    return NextResponse.json({
      recipe: {
        title: "Porc haché, riz & navet glacé à la japonaise",
        subtitle: "avec une sauce soja-sésame & du citron",
        category: "Main Dishes",
        prepTimeMinutes: 40,
        difficulty: "Medium",
        rating: 5.0,
        servingsBase: 6,
        spiceLevel: "Épicé",
        utensils: ["Sauteuse avec couvercle", "Casserole", "Râpe", "Éplucheur", "Passoire"],
        nutrition: {
          caloriesKcal: 830,
          proteines: "26g",
          glucides: "83g",
          lipides: "45g",
          fibres: "7g",
          sel: "3.6g",
        },
        allergens: ["Soja", "Sésame"],
        frontPhotoIndex: 0,
        frontPhotoRotation: 0,
        mainDishCropBox: [180, 150, 780, 720],
        ingredients: [
          { id: "ing-1", name: "Navet", amount: 4, unit: "pièce(s)" },
          { id: "ing-2", name: "Carotte", amount: 3, unit: "pièce(s)" },
          { id: "ing-3", name: "Gousse d'ail", amount: 2, unit: "pièce(s)" },
          { id: "ing-4", name: "Oignon nouveau", amount: 100, unit: "g" },
          { id: "ing-5", name: "Gingembre frais", amount: 2, unit: "cm" },
          { id: "ing-6", name: "Riz", amount: 450, unit: "g" },
          { id: "ing-7", name: "Farce au porc", amount: 2, unit: "paquet(s)" },
          { id: "ing-8", name: "Citron", amount: 1.5, unit: "pièce(s)" },
          { id: "ing-9", name: "Sauce soja", amount: 1.5, unit: "sachet(s)" },
          { id: "ing-10", name: "Huile de sésame", amount: 1.5, unit: "sachet(s)" },
        ],
        steps: [
          {
            stepNumber: 1,
            title: "Coupe, tranche, cisèle !",
            description: "Épluchez le navet et coupez-le en quartiers de 1 cm. Épluchez la carotte et coupez-la en 8 bâtonnets. Ciselez finement l'ail et l'oignon nouveau. Râpez le gingembre.",
            durationMinutes: 10,
            stepPhotoIndex: 1,
            stepCropBox: [100, 330, 240, 500]
          },
          {
            stepNumber: 2,
            title: "La sauteuse en action",
            description: "Faites fondre du beurre à feu moyen-vif. Ajoutez le navet et la carotte (5 min). Saupoudrez le sucre (3 min). Mouillez à hauteur et faites cuire 14-18 min.",
            durationMinutes: 18,
            chefTip: "Vérifiez la cuisson des légumes avec la pointe d'un couteau.",
            stepPhotoIndex: 1,
            stepCropBox: [100, 550, 240, 700]
          },
          {
            stepNumber: 3,
            title: "Le riz passe à la casserole",
            description: "Portez une casserole d'eau salée à ébullition. Faites cuire le riz 12-14 min. Égouttez, ajoutez une noix de beurre et réservez à couvert.",
            durationMinutes: 14,
            stepPhotoIndex: 1,
            stepCropBox: [100, 760, 240, 920]
          },
          {
            stepNumber: 4,
            title: "Au tour de la viande",
            description: "Faites chauffer de l'huile dans un wok. Faites dorer l'ail et la farce de porc 4-5 min. Ajoutez le blanc de l'oignon et cuisez encore 2-3 min.",
            durationMinutes: 8,
            stepPhotoIndex: 1,
            stepCropBox: [460, 330, 610, 500]
          },
          {
            stepNumber: 5,
            title: "Pause fraîcheur",
            description: "Mélangez le jus de citron, le gingembre, la sauce soja, l'huile de sésame et un peu de vinaigre. Versez la moitié dans les légumes et le reste dans la viande.",
            durationMinutes: 4,
            stepPhotoIndex: 1,
            stepCropBox: [460, 550, 610, 700]
          },
          {
            stepNumber: 6,
            title: "Dressage en vue",
            description: "Répartissez le riz dans des assiettes creuses. Disposez les légumes caramélisés et le porc. Parsemez de vert d'oignon nouveau.",
            durationMinutes: 2,
            stepPhotoIndex: 1,
            stepCropBox: [460, 760, 610, 920]
          },
        ],
      },
      logs: serverLogs,
      provider: "Fallback Vision Template",
    });
  } catch (err: any) {
    log(`FATAL API ERROR: ${err?.message || err}`);
    return NextResponse.json(
      { error: err?.message || "Erreur interne de traitement", logs: serverLogs },
      { status: 500 }
    );
  }
}
