import { NextRequest, NextResponse } from "next/server";

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
    const openAiApiKey = process.env.OPENAI_API_KEY;

    log(`Clés API détectées: Gemini=${Boolean(geminiApiKey)}, OpenAI=${Boolean(openAiApiKey)}`);

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
2. DÉTECTION D'ORIENTATION (TRÈS IMPORTANT) :
   - Analyse l'orientation de chaque photo (photo 0, photo 1, etc.).
   - Indique la rotation en degrés (0, 90, 180, ou 270) nécessaire pour que le texte soit parfaitement horizontal, droit et lisible de gauche à droite.
3. DÉTECTION & RECADRAGE DES IMAGES :
   - Sur la photo du plat fini (recto) : Détecte les coordonnées [ymin, xmin, ymax, xmax] (échelle 0 à 1000) de l'assiette/bol ("mainDishCropBox") une fois la photo remise droite.
   - Sur la photo des étapes (verso) : Pour CHAQUE étape numérotée (Étape 1, 2, 3, 4, 5, 6...), identifie avec grande précision le rectangle [ymin, xmin, ymax, xmax] (échelle 0 à 1000) de la photo/illustration de l'étape correspondante ("stepCropBox") une fois la photo remise droite.

Réponds STRICTEMENT avec un JSON valide respectant cette structure exacte :
{
  "title": "Nom exact du plat extrait par OCR",
  "subtitle": "Sous-titre ou description courte",
  "category": "Main Dishes" | "Soups & Stews" | "Appetizers" | "Pastas" | "Desserts",
  "prepTimeMinutes": 35,
  "difficulty": "Easy" | "Medium" | "Hard",
  "rating": 5.0,
  "servingsBase": 4,
  "spiceLevel": "Épicé" | "Doux" | "Moyen",
  "utensils": ["Wok", "Casserole"],
  "nutrition": {
    "caloriesKcal": 650,
    "proteines": "24g",
    "glucides": "75g",
    "lipides": "28g"
  },
  "allergens": ["Sésame", "Soja"],
  "photoOrientations": [0, 90],
  "frontPhotoIndex": 0,
  "mainDishCropBox": [120, 100, 820, 880],
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
      "imagePrompt": "Detailed English food photography prompt describing the exact visual scene seen in this step photo (e.g. 'Top-down photo of chopped sweet potatoes and carrots neatly cut on a rustic wooden board with sliced garlic and ginger, studio lighting, 8k culinary photograph')"
    }
  ]
}`;

    // 1. Google Gemini 3.8 Flash Multimodal Vision
    if (geminiApiKey) {
      const candidateModels = [
        "gemini-3.5-flash-lite",
        "gemini-3.5-flash",
        "gemini-flash-lite-latest",
        "gemini-3.8-flash",
        "gemini-flash-latest",
      ];

      for (const model of candidateModels) {
        try {
          log(`Appel de l'IA Google Gemini avec le modèle ${model}...`);
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
            signal: AbortSignal.timeout(18000),
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
              log(`Succès OCR Gemini (${model}) : Plat "${parsed.title}" avec ${parsed.ingredients?.length || 0} ingrédients et ${parsed.steps?.length || 0} étapes.`);
              return NextResponse.json({
                recipe: parsed,
                logs: serverLogs,
                provider: `Gemini (${model})`,
              });
            } else {
              log(`Réponse Gemini (${model}) reçue sans texte exploitable.`);
            }
          } else {
            const errText = await geminiRes.text();
            log(`Erreur Gemini HTTP ${geminiRes.status}: ${errText.substring(0, 200)}`);
          }
        } catch (geminiError: any) {
          log(`Exception Gemini (${model}): ${geminiError?.message || geminiError}`);
        }
      }
    }

    // 2. OpenAI GPT-4o Vision
    if (openAiApiKey) {
      try {
        log("Appel de l'API OpenAI GPT-4o Vision...");
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
            log(`Succès OpenAI GPT-4o : Plat "${parsed.title}" avec ${parsed.ingredients?.length || 0} ingrédients.`);
            return NextResponse.json({
              recipe: parsed,
              logs: serverLogs,
              provider: "OpenAI GPT-4o",
            });
          }
        } else {
          const errText = await openAiRes.text();
          log(`Erreur OpenAI HTTP ${openAiRes.status}: ${errText.substring(0, 200)}`);
        }
      } catch (openAiError: any) {
        log(`Exception OpenAI: ${openAiError?.message || openAiError}`);
      }
    }

    // No mock/fake data fallback: Return honest error with logs if OCR failed
    log("ÉCHEC : Aucun modèle de vision n'a pu extraire la recette.");
    return NextResponse.json(
      {
        error: "L'analyse visuelle par IA a échoué. Veuillez vérifier la lisibilité des photos et la clé API Gemini.",
        logs: serverLogs,
      },
      { status: 502 }
    );
  } catch (err: any) {
    log(`FATAL API ERROR: ${err?.message || err}`);
    return NextResponse.json(
      { error: err?.message || "Erreur interne de traitement", logs: serverLogs },
      { status: 500 }
    );
  }
}
