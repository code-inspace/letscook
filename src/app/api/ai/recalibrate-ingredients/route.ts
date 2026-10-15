import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_SERVINGS } from "@/features/recipes/types";
import { sanitizeSuggestions } from "@/features/recipes/recalibration";

export const maxDuration = 60;
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface InputIngredient {
  name: string;
  amount: number | null;
  unit: string;
}

const CANDIDATE_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.5-flash",
  "gemini-flash-lite-latest",
  "gemini-3.8-flash",
  "gemini-flash-latest",
];

function buildPrompt(title: string, servingsBase: number, ingredients: InputIngredient[], steps: string[]) {
  const list = ingredients
    .map((ing, i) => `${i}. ${ing.name} — ${ing.amount ?? "(sans quantité)"} ${ing.unit || ""}`.trim())
    .join("\n");
  const stepsText = steps.length
    ? `\nÉtapes (pour le contexte) :\n${steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}\n`
    : "";

  return `Tu es un chef cuisinier français expert en fiches recettes. Vérifie les quantités et unités des ingrédients de la recette ci-dessous, prévue pour ${servingsBase} personne(s).

Recette : ${title}
Ingrédients (index. nom — quantité unité) :
${list}
${stepsText}
OBJECTIF : proposer des corrections UNIQUEMENT pour les ingrédients dont la quantité ou l'unité est incohérente ou inexploitable pour faire les courses :
- Unités vagues ou absurdes pour l'ingrédient : "portion(s)", "part(s)", "sachet" sans poids, "pièce(s)" pour du riz, des pâtes, des crevettes, de la viande hachée, de la farine, du fromage râpé, etc. → convertis en g, kg, ml, cl ou L avec une quantité réaliste pour ${servingsBase} personne(s) (ex. riz ≈ 70-80 g cru par personne, crevettes ≈ 100-150 g par personne, pâtes ≈ 100 g par personne).
- Quantités manifestement fausses pour ${servingsBase} personne(s) (ex. 1 kg de sel, 10 g de poulet pour 4) → corrige-les.
- Quantité manquante alors qu'elle est indispensable pour acheter l'ingrédient → propose-en une.
- Unités à normaliser en français : g, kg, ml, cl, L, c. à soupe, c. à café, pincée, gousse(s), pièce(s), tranche(s), botte(s).
NE PROPOSE RIEN pour :
- les ingrédients déjà cohérents (ex. 2 œufs en pièce(s), 1 oignon, 1 gousse d'ail, 200 g de riz) ;
- le sel, le poivre et les épices "selon le goût" s'ils n'ont pas de quantité.
Ne renomme un ingrédient que si son nom est clairement erroné ou mal orthographié. Réponds en français.

Réponds STRICTEMENT avec un JSON valide de cette forme (liste vide si tout est cohérent) :
{
  "suggestions": [
    { "index": 0, "name": "Riz basmati", "amount": 300, "unit": "g", "reason": "Le riz se mesure au poids : environ 75 g cru par personne." }
  ]
}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const title = String(body?.title || "Recette");
    const servingsBase = Math.max(1, Number(body?.servingsBase) || DEFAULT_SERVINGS);
    const ingredients: InputIngredient[] = Array.isArray(body?.ingredients)
      ? body.ingredients.map((i: any) => ({
          name: String(i?.name || "").trim(),
          amount: typeof i?.amount === "number" && Number.isFinite(i.amount) ? i.amount : null,
          unit: String(i?.unit || "").trim(),
        }))
      : [];
    const steps: string[] = Array.isArray(body?.steps)
      ? body.steps.map((s: unknown) => String(s || "").slice(0, 400)).slice(0, 15)
      : [];

    if (ingredients.length === 0) {
      return NextResponse.json({ error: "Aucun ingrédient à recalibrer." }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Clé API Gemini manquante sur le serveur." }, { status: 500 });
    }

    const prompt = buildPrompt(title, servingsBase, ingredients, steps);
    let lastError = "";

    for (const model of CANDIDATE_MODELS) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { response_mime_type: "application/json", temperature: 0.1 },
            }),
            signal: AbortSignal.timeout(25000),
          }
        );
        if (!res.ok) {
          lastError = `${model}: HTTP ${res.status}`;
          continue;
        }
        const data = await res.json();
        const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
          lastError = `${model}: réponse vide`;
          continue;
        }
        const parsed = JSON.parse(text.replace(/```json/g, "").replace(/```/g, "").trim());
        return NextResponse.json({ suggestions: sanitizeSuggestions(parsed, ingredients), provider: model });
      } catch (err: any) {
        lastError = `${model}: ${err?.message || err}`;
      }
    }

    console.warn("recalibrate-ingredients failed:", lastError);
    return NextResponse.json(
      { error: "L'IA n'a pas pu analyser les ingrédients. Réessayez dans un instant." },
      { status: 502 }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Requête invalide" }, { status: 400 });
  }
}
