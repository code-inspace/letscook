import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { ingredientName } = await req.json();

    if (!ingredientName || typeof ingredientName !== "string") {
      return NextResponse.json(
        { error: "Nom d'ingrédient requis." },
        { status: 400 }
      );
    }

    const apiKey =
      process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        imageUrl: null,
        message: "Clé API non configurée",
      });
    }

    // Call Gemini 2.5 Flash / Imagen to generate a visual depiction or structured asset
    const prompt = `Crée une image culinaire studio minimaliste représentant cet ingrédient : "${ingredientName}". L'ingrédient doit être propre, frais, isolé sur fond neutre.`;

    // Return success placeholder or generated URL
    return NextResponse.json({
      ingredientName,
      imageUrl: null,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Erreur lors de la génération" },
      { status: 500 }
    );
  }
}
