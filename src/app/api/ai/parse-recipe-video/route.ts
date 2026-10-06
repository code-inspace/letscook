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
    log("Réception de la vidéo sur /api/ai/parse-recipe-video");
    const formData = await req.formData();
    const videoFile = formData.get("video") as File | null;
    const additionalNotes = formData.get("notes") as string | null;

    if (!videoFile || videoFile.size === 0) {
      return NextResponse.json(
        { error: "Aucun fichier vidéo fourni.", logs: serverLogs },
        { status: 400 }
      );
    }

    const sizeMb = (videoFile.size / (1024 * 1024)).toFixed(2);
    const mimeType = videoFile.type || "video/mp4";
    log(`Fichier vidéo reçu : ${videoFile.name} (${sizeMb} MB, ${mimeType})`);

    const geminiApiKey =
      process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    if (!geminiApiKey) {
      throw new Error("Clé API Gemini manquante pour l'analyse vidéo.");
    }

    // Convert video buffer to base64
    const buffer = Buffer.from(await videoFile.arrayBuffer());
    const base64Data = buffer.toString("base64");
    log(`Conversion vidéo terminée (${(base64Data.length / 1024).toFixed(1)} KB base64).`);

    const prompt = `Tu es un chef cuisinier expert et un système d'analyse vidéo culinaire de pointe.
Analyse cette vidéo culinaire (Reel / TikTok / recette vidéo) et ses éventuelles notes :
${additionalNotes ? `Notes complémentaires de l'utilisateur : "${additionalNotes}"` : ""}

TÂCHE D'ANALYSE :
1. Écoute attentivement la voix off / l'audio pour repérer les explications et les quantités orales.
2. Lis tous les textes ou sous-titres incrustés à l'écran.
3. Observe les gestes et les ingrédients manipulés dans la vidéo.
4. Synthétise le tout pour générer une recette complète, précise et calibrée par défaut pour 6 personnes.

Réponds STRICTEMENT avec ce JSON valide :
{
  "title": "Nom précis et appétissant du plat",
  "subtitle": "Courte description ou style culinaire",
  "category": "Main Dishes" | "Soups & Stews" | "Appetizers" | "Pastas" | "Desserts" | "Salads",
  "prepTimeMinutes": 30,
  "difficulty": "Easy" | "Medium" | "Hard",
  "rating": 5.0,
  "servingsBase": 6,
  "spiceLevel": "Doux" | "Moyen" | "Épicé",
  "utensils": ["Poêle", "Spatule"],
  "ingredients": [
    { "id": "ing_1", "name": "Nom de l'ingrédient", "amount": 200, "unit": "g" }
  ],
  "steps": [
    { "stepNumber": 1, "title": "Titre étape 1", "description": "Instructions détaillées de préparation...", "durationMinutes": 5 }
  ]
}`;

    log("Envoi de la vidéo au modèle multimodal Google Gemini 2.5 Flash...");

    const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;
    const geminiRes = await fetch(geminiEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64Data,
                },
              },
              { text: prompt },
            ],
          },
        ],
        generationConfig: {
          response_mime_type: "application/json",
          temperature: 0.1,
        },
      }),
      signal: AbortSignal.timeout(50000),
    });

    if (!geminiRes.ok) {
      const errBody = await geminiRes.text();
      log(`Erreur API Gemini (HTTP ${geminiRes.status}): ${errBody}`);
      throw new Error(`Échec de l'analyse vidéo par Gemini (HTTP ${geminiRes.status}).`);
    }

    const geminiData = await geminiRes.json();
    const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      throw new Error("Gemini n'a renvoyé aucun résultat textuel.");
    }

    const cleanedText = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsedRecipe = JSON.parse(cleanedText);
    parsedRecipe.id = `recipe_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    parsedRecipe.servingsBase = parsedRecipe.servingsBase || 6;

    log(`Analyse vidéo réussie : "${parsedRecipe.title}" (${parsedRecipe.ingredients?.length || 0} ingrédients, ${parsedRecipe.steps?.length || 0} étapes).`);

    return NextResponse.json({
      recipe: parsedRecipe,
      logs: serverLogs,
      provider: "Google Gemini Multimodal Video AI",
    });
  } catch (err: any) {
    log(`Erreur globale analyse vidéo: ${err?.message || err}`);
    return NextResponse.json(
      {
        error: err?.message || "Erreur lors de l'analyse de la vidéo.",
        logs: serverLogs,
      },
      { status: 500 }
    );
  }
}
