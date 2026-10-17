import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_SERVINGS } from "@/features/recipes/types";

export const maxDuration = 60;
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Gemini accepts up to ~20 MB of inline data per request
const MAX_PDF_BYTES = 18 * 1024 * 1024;

const CANDIDATE_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.5-flash",
  "gemini-flash-lite-latest",
  "gemini-3.8-flash",
  "gemini-flash-latest",
];

const PROMPT = `Tu es un chef cuisinier expert et un système d'extraction de recettes depuis des documents PDF (livres de cuisine, fiches HelloFresh/Quitoque, recettes imprimées ou scannées).

INSTRUCTIONS :
1. Extrais TOUTES les recettes présentes dans le PDF (souvent une seule, parfois plusieurs). N'invente rien : titre, ingrédients et étapes doivent provenir du document.
2. TRADUCTION OBLIGATOIRE EN FRANÇAIS si le document est dans une autre langue (titres, ingrédients avec unités métriques usuelles, étapes).
3. Quantités : unités françaises (g, kg, ml, cl, L, c. à soupe, c. à café, pincée, gousse(s), pièce(s)). Si une quantité est donnée en "portion" ou de façon vague pour un ingrédient qui s'achète au poids (riz, pâtes, crevettes, viande…), convertis-la en grammes réalistes pour le nombre de personnes de la recette.
4. Photo du plat : si le document contient une photo du plat fini pour une recette, indique la page (numérotée à partir de 1) dans "dishPhotoPage" et le rectangle de la photo [ymin, xmin, ymax, xmax] sur une échelle de 0 à 1000 de la page dans "dishPhotoBox". Sinon mets null pour les deux.

Réponds STRICTEMENT avec un JSON valide de cette forme :
{
  "recipes": [
    {
      "title": "Nom du plat",
      "subtitle": "Courte description",
      "category": "Main Dishes" | "Soups & Stews" | "Appetizers" | "Pastas" | "Desserts" | "Salads" | "Breakfast" | "Sides",
      "prepTimeMinutes": 30,
      "difficulty": "Easy" | "Medium" | "Hard",
      "servingsBase": 4,
      "spiceLevel": "Doux" | "Moyen" | "Épicé",
      "utensils": ["Poêle"],
      "nutrition": { "caloriesKcal": 650, "proteines": "24g", "glucides": "75g", "lipides": "28g" },
      "allergens": ["Gluten"],
      "dishPhotoPage": 1,
      "dishPhotoBox": [120, 100, 520, 900],
      "ingredients": [{ "id": "ing_1", "name": "Riz basmati", "amount": 300, "unit": "g" }],
      "steps": [{ "stepNumber": 1, "title": "Cuire le riz", "description": "Instructions détaillées…", "durationMinutes": 12, "chefTip": "" }]
    }
  ]
}`;

export async function POST(req: NextRequest) {
  const logs: string[] = [];
  const log = (msg: string) => logs.push(`[${new Date().toISOString().substring(11, 19)}] ${msg}`);

  try {
    const formData = await req.formData();
    const pdf = formData.get("pdf");
    if (!(pdf instanceof File) || pdf.size === 0) {
      return NextResponse.json({ error: "Aucun fichier PDF fourni.", logs }, { status: 400 });
    }
    if (pdf.type && pdf.type !== "application/pdf") {
      return NextResponse.json({ error: "Le fichier n'est pas un PDF.", logs }, { status: 400 });
    }
    if (pdf.size > MAX_PDF_BYTES) {
      return NextResponse.json(
        { error: "PDF trop volumineux (18 Mo maximum). Exportez seulement les pages de la recette.", logs },
        { status: 413 }
      );
    }
    log(`PDF reçu : ${pdf.name} (${(pdf.size / (1024 * 1024)).toFixed(2)} Mo)`);

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Clé API Gemini manquante sur le serveur.", logs }, { status: 500 });
    }
    const base64 = Buffer.from(await pdf.arrayBuffer()).toString("base64");

    for (const model of CANDIDATE_MODELS) {
      try {
        log(`Analyse du PDF avec ${model}…`);
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  parts: [{ inline_data: { mime_type: "application/pdf", data: base64 } }, { text: PROMPT }],
                },
              ],
              generationConfig: { response_mime_type: "application/json", temperature: 0.1 },
            }),
            signal: AbortSignal.timeout(50000),
          }
        );
        if (!res.ok) {
          log(`${model} : HTTP ${res.status} ${(await res.text()).substring(0, 160)}`);
          continue;
        }
        const data = await res.json();
        const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
          log(`${model} : réponse vide`);
          continue;
        }
        const parsed = JSON.parse(text.replace(/```json/g, "").replace(/```/g, "").trim());
        const recipes = (Array.isArray(parsed?.recipes) ? parsed.recipes : [parsed])
          .filter((r: any) => r && typeof r.title === "string" && r.title.trim())
          .map((r: any) => ({
            ...r,
            servingsBase: Number(r.servingsBase) || DEFAULT_SERVINGS,
            ingredients: Array.isArray(r.ingredients) ? r.ingredients : [],
            steps: Array.isArray(r.steps) ? r.steps : [],
            dishPhotoPage: Number.isInteger(r.dishPhotoPage) && r.dishPhotoPage > 0 ? r.dishPhotoPage : null,
            dishPhotoBox:
              Array.isArray(r.dishPhotoBox) && r.dishPhotoBox.length === 4 && r.dishPhotoBox.every(Number.isFinite)
                ? r.dishPhotoBox
                : null,
          }));
        if (recipes.length === 0) {
          log(`${model} : aucune recette trouvée`);
          continue;
        }
        log(`${recipes.length} recette(s) extraite(s) avec ${model}.`);
        return NextResponse.json({ recipes, logs, provider: model });
      } catch (err: any) {
        log(`${model} : ${err?.message || err}`);
      }
    }

    return NextResponse.json(
      { error: "L'IA n'a trouvé aucune recette exploitable dans ce PDF.", logs },
      { status: 502 }
    );
  } catch (err: any) {
    log(`Erreur : ${err?.message || err}`);
    return NextResponse.json({ error: err?.message || "Erreur interne", logs }, { status: 500 });
  }
}
