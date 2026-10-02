import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { prompt, stepNumber, recipeTitle } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: "Prompt requis" }, { status: 400 });
    }

    const openAiApiKey = process.env.OPENAI_API_KEY;
    const geminiApiKey =
      process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    let lastError = "";

    // 1. OpenAI ChatGPT / DALL-E Pure Generative AI
    if (openAiApiKey) {
      const openAiImageModels = [
        "chatgpt-image-latest",
        "gpt-image-1",
        "gpt-image-1.5",
        "gpt-image-1-mini",
        "dall-e-3",
      ];

      for (const model of openAiImageModels) {
        try {
          const enhancedPrompt = `Gourmet culinary food photography, step ${stepNumber || 1} of ${recipeTitle || "cooking"}: ${prompt}, ultra realistic, 4k food magazine quality, appetizing, cinematic soft studio lighting`;
          const res = await fetch("https://api.openai.com/v1/images/generations", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${openAiApiKey}`,
            },
            body: JSON.stringify({
              model,
              prompt: enhancedPrompt,
              n: 1,
              size: "1024x1024",
            }),
          });

          if (res.ok) {
            const data = await res.json();
            const imageUrl = data?.data?.[0]?.url;
            if (imageUrl) {
              return NextResponse.json({
                imageUrl,
                provider: `OpenAI ${model}`,
              });
            }
          } else {
            const errData = await res.json();
            lastError =
              errData?.error?.message ||
              `Erreur OpenAI HTTP ${res.status}: ${JSON.stringify(errData)}`;
          }
        } catch (dallErr: any) {
          lastError = dallErr?.message || String(dallErr);
          console.warn(`OpenAI image gen (${model}) failed:`, dallErr);
        }
      }
    }

    // 2. Google AI NanoBanana / Imagen Image Generation
    if (geminiApiKey) {
      const imageModels = [
        "nano-banana-pro-preview",
        "gemini-2.5-flash-image",
        "gemini-3.1-flash-image",
      ];

      for (const model of imageModels) {
        try {
          const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`;
          const res = await fetch(geminiEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: `Generate a 4K studio culinary food photograph of: ${prompt}`,
                    },
                  ],
                },
              ],
            }),
          });

          if (res.ok) {
            const data = await res.json();
            const part = data?.candidates?.[0]?.content?.parts?.[0];
            if (part?.inline_data?.data) {
              const mime = part.inline_data.mime_type || "image/jpeg";
              return NextResponse.json({
                imageUrl: `data:${mime};base64,${part.inline_data.data}`,
                provider: `Google ${model}`,
              });
            }
          } else {
            const gemErr = await res.json();
            lastError =
              gemErr?.error?.message ||
              `Erreur Gemini HTTP ${res.status}: ${JSON.stringify(gemErr)}`;
          }
        } catch (geminiImgErr: any) {
          lastError = geminiImgErr?.message || String(geminiImgErr);
          console.warn(`Gemini ${model} failed:`, geminiImgErr);
        }
      }
    }

    return NextResponse.json(
      {
        error:
          lastError ||
          "La génération d'images par IA a échoué. Veuillez vérifier vos crédits OpenAI.",
      },
      { status: 502 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Erreur de génération" },
      { status: 500 }
    );
  }
}
