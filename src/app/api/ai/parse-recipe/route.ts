import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files: File[] = [];

    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        files.push(value);
      }
    }

    if (files.length === 0) {
      return NextResponse.json({ error: "Aucune photo fournie." }, { status: 400 });
    }

    const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    const openAiApiKey = process.env.OPENAI_API_KEY;

    if (!geminiApiKey && !openAiApiKey) {
      return NextResponse.json(
        {
          error:
            "Aucune clé API IA configurée (veuillez configurer GEMINI_API_KEY ou OPENAI_API_KEY dans vos variables d'environnement).",
        },
        { status: 500 }
      );
    }

    // Convert all uploaded images to base64
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

    const systemPrompt = `Tu es un chef cuisinier expert et un extracteur de fiches recettes (comme HelloFresh, Quitoque, etc.).
Tu reçois un lot de photos d'une même recette (par exemple la photo du plat terminé/ingrédients au recto, et la fiche des étapes 1 à 6 au verso).

Analyse minutieusement toutes les photos jointes. Associe le titre, les photos d'étapes, les ingrédients avec leurs quantités exactes et leurs unités, le temps de préparation, la difficulté, le niveau d'épice, les ustensiles et les valeurs nutritionnelles si visibles.

Tu dois répondre UNIQUEMENT avec un objet JSON valide sans markdown superflu respectant cette structure exacte :
{
  "title": "Nom exact du plat",
  "subtitle": "Sous-titre ou description courte",
  "category": "Main Dishes" | "Soups & Stews" | "Appetizers" | "Pastas" | "Desserts",
  "prepTimeMinutes": 35,
  "difficulty": "Easy" | "Medium" | "Hard",
  "rating": 5.0,
  "servingsBase": 4,
  "spiceLevel": "Doux" | "Moyen" | "Épicé",
  "utensils": ["Sauteuse", "Casserole", "Râpe"],
  "nutrition": {
    "caloriesKcal": 650,
    "proteines": "25g",
    "glucides": "70g",
    "lipides": "28g",
    "fibres": "6g",
    "sel": "3g"
  },
  "allergens": ["Soja", "Sésame"],
  "ingredients": [
    { "id": "ing_1", "name": "Nom de l'ingrédient", "amount": 2, "unit": "pièce(s)" }
  ],
  "steps": [
    {
      "stepNumber": 1,
      "title": "Titre de l'étape",
      "description": "Instructions détaillées et claires",
      "durationMinutes": 10,
      "chefTip": "Astuce facultative du chef si présente"
    }
  ]
}`;

    // 1. Preferred: Google Gemini 2.5/2.0/1.5 Flash (Ultra-fast multimodal vision)
    if (geminiApiKey) {
      try {
        const geminiParts: any[] = [{ text: systemPrompt }];
        imagesData.forEach((img) => {
          geminiParts.push({
            inline_data: {
              mime_type: img.mimeType,
              data: img.base64,
            },
          });
        });

        const geminiModel = "gemini-2.5-flash";
        const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`;

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

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const rawText =
            geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            const parsed = JSON.parse(rawText);
            return NextResponse.json({ recipe: parsed });
          }
        } else {
          console.warn("Gemini Flash call failed with status:", geminiRes.status);
        }
      } catch (geminiError: any) {
        console.warn("Gemini API error:", geminiError?.message);
      }
    }

    // 2. Secondary: OpenAI GPT-4o Vision
    if (openAiApiKey) {
      try {
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

        if (openAiRes.ok) {
          const aiJson = await openAiRes.json();
          const rawContent = aiJson.choices?.[0]?.message?.content;
          if (rawContent) {
            const parsed = JSON.parse(rawContent);
            return NextResponse.json({ recipe: parsed });
          }
        }
      } catch (openAiError: any) {
        console.warn("OpenAI API error:", openAiError?.message);
      }
    }

    return NextResponse.json(
      { error: "L'IA n'a pas pu extraire la recette. Vérifiez la validité de votre clé d'API." },
      { status: 502 }
    );
  } catch (err: any) {
    console.error("API parse-recipe error:", err);
    return NextResponse.json({ error: err?.message || "Erreur interne de traitement" }, { status: 500 });
  }
}
