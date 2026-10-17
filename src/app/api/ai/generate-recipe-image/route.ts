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
    // Image models have no free tier (quota "limit: 0"): tell the user what to do
    let quotaErrors = 0;
    const deadline = Date.now() + 55_000;

    // 2. Essai avec les modèles d'image Gemini
    if (geminiApiKey) {
      const imageModels = [
        "gemini-2.5-flash-image",
        "gemini-3.1-flash-image",
        "gemini-3-pro-image",
        "gemini-3.1-flash-lite-image",
      ];

      for (const model of imageModels) {
        const remaining = deadline - Date.now();
        if (remaining < 5_000) break;
        try {
          const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`;
          const res = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: `Generate an image of: ${promptText}` }] }],
            }),
            // Image generation commonly takes 10-25 s
            signal: AbortSignal.timeout(Math.min(30_000, remaining)),
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
            if (res.status === 429) quotaErrors++;
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
    const allQuota = quotaErrors > 0 && quotaErrors === attemptedErrors.length;
    return NextResponse.json(
      {
        error: allQuota
          ? "La génération de photos n'est pas disponible avec l'offre gratuite de Google Gemini (quota d'images à 0). Activez la facturation du projet Google AI Studio pour l'utiliser. En attendant, vous pouvez ajouter une photo depuis votre appareil."
          : "La génération de photo par IA a échoué. Réessayez dans un instant ou ajoutez une photo depuis votre appareil.",
        code: allQuota ? "IMAGE_QUOTA" : "IMAGE_FAILED",
        details: attemptedErrors,
      },
      { status: allQuota ? 429 : 503 }
    );
  } catch (err: any) {
    console.error("generate-recipe-image error:", err);
    return NextResponse.json(
      { error: err?.message || "Erreur lors de la génération d'image par IA." },
      { status: 500 }
    );
  }
}
