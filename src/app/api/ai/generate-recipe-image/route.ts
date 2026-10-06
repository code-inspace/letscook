import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 45;
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
  try {
    const { title, description, stepNumber, type = "main", ingredientsSummary } = await req.json();

    if (!title && !description) {
      return NextResponse.json(
        { error: "Titre ou description requis pour générer une image." },
        { status: 400 }
      );
    }

    const cleanTitle = (title || description || "Plat cuisiné").replace(/[^\w\s\u00C0-\u017F-]/g, "").trim();

    // 1. Prompt culinaire professionnel en anglais pour l'IA
    let promptText = "";
    if (type === "step") {
      promptText = `Professional culinary cooking photography, step ${stepNumber || 1} for ${cleanTitle}: ${description || "cooking action"}. Close-up cooking process shot, warm bright kitchen, gourmet food styling, 4k, hyperrealistic`;
    } else {
      promptText = `Delicious culinary food photography of ${cleanTitle}${ingredientsSummary ? ` with ${ingredientsSummary}` : ""}, served on a modern ceramic plate in a gourmet restaurant, warm natural lighting, shallow depth of field, high detail, 4k`;
    }

    const geminiApiKey =
      process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    const attemptedErrors: string[] = [];

    // 2. Essai avec les modèles d'image Gemini
    if (geminiApiKey) {
      const imageModels = [
        "gemini-2.5-flash-image",
        "gemini-3.1-flash-image",
        "gemini-3-pro-image",
        "gemini-3.1-flash-lite-image",
      ];

      for (const model of imageModels) {
        try {
          const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`;
          const res = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: `Generate an image of: ${promptText}` }] }],
            }),
            signal: AbortSignal.timeout(12000),
          });

          if (res.ok) {
            const data = await res.json();
            const part = data?.candidates?.[0]?.content?.parts?.find(
              (p: any) => p.inline_data || p.inlineData
            );
            const inline = part?.inline_data || part?.inlineData;
            if (inline?.data) {
              const mime = inline.mime_type || inline.mimeType || "image/jpeg";
              return NextResponse.json({
                imageUrl: `data:${mime};base64,${inline.data}`,
                provider: `Gemini AI (${model})`,
              });
            }
          } else {
            const errJson = await res.json().catch(() => ({}));
            attemptedErrors.push(`${model} (HTTP ${res.status}): ${errJson?.error?.message || res.statusText}`);
          }
        } catch (mErr: any) {
          attemptedErrors.push(`${model}: ${mErr?.message || mErr}`);
        }
      }
    } else {
      attemptedErrors.push("Aucune clé GEMINI_API_KEY configurée");
    }

    // 3. Aucune IA n'a pu générer l'image : renvoyer une erreur explicite SANS substitut stock
    console.warn("AI Image Generation failed:", attemptedErrors);
    return NextResponse.json(
      {
        error:
          "La génération d'image par IA n'a pas pu aboutir (quota de génération d'image Google Gemini dépassé ou indisponible). Vous pouvez uploader une photo depuis votre appareil ou réessayer ultérieurement.",
        details: attemptedErrors,
      },
      { status: 503 }
    );
  } catch (err: any) {
    console.error("generate-recipe-image error:", err);
    return NextResponse.json(
      { error: err?.message || "Erreur lors de la génération d'image par IA." },
      { status: 500 }
    );
  }
}
