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

    // Construire un prompt culinaire professionnel en anglais
    let prompt = "";
    if (type === "step") {
      prompt = `Professional culinary step-by-step cooking photography: step ${stepNumber || 1} for recipe "${title}". Action: ${description}. Close up cooking preparation shot, warm kitchen lighting, hyperrealistic, gourmet food styling, 4k`;
    } else {
      prompt = `Gourmet culinary photography of ${title}${ingredientsSummary ? ` made with ${ingredientsSummary}` : ""}, served on an elegant plate, restaurant quality, warm natural lighting, shallow depth of field, appetizing, delicious, 4k`;
    }

    const geminiApiKey =
      process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    // 1. Essai avec les modèles d'image Gemini si disponibles
    if (geminiApiKey) {
      const imageModels = [
        "gemini-2.5-flash-image",
        "gemini-3.1-flash-image",
        "gemini-3-pro-image",
      ];

      for (const model of imageModels) {
        try {
          const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`;
          const res = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: `Generate an image: ${prompt}` }] }],
            }),
            signal: AbortSignal.timeout(10000),
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
                provider: `Gemini Image (${model})`,
              });
            }
          }
        } catch {}
      }
    }

    // 2. Fallback ultra-rapide et haute qualité Flux / Pollinations AI
    const encodedPrompt = encodeURIComponent(prompt.substring(0, 300));
    const seed = Math.floor(Math.random() * 1000000);
    const generatedUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?seed=${seed}&width=1024&height=768&nologo=true&model=flux`;

    return NextResponse.json({
      imageUrl: generatedUrl,
      provider: "Flux Culinary AI",
    });
  } catch (err: any) {
    console.error("generate-recipe-image error:", err);
    return NextResponse.json(
      { error: err?.message || "Erreur lors de la génération d'image" },
      { status: 500 }
    );
  }
}
