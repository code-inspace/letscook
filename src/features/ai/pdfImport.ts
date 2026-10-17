import { Recipe, DEFAULT_SERVINGS } from "@/features/recipes/types";
import { cropAndRotateRegion } from "./visionParser";

export const MAX_PDF_MB = 18;

type PdfJs = typeof import("pdfjs-dist");
let pdfjsPromise: Promise<PdfJs> | null = null;

/** pdf.js is heavy: loaded on demand, only when a PDF is imported. */
function loadPdfJs(): Promise<PdfJs> {
  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist").then((pdfjs) => {
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url
      ).toString();
      return pdfjs;
    });
  }
  return pdfjsPromise;
}

/** Renders the given pages (1-based) of a PDF to JPEG data URLs. */
export async function renderPdfPages(file: File, pages: number[]): Promise<Map<number, string>> {
  const out = new Map<number, string>();
  if (pages.length === 0) return out;
  const pdfjs = await loadPdfJs();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  try {
    for (const pageNumber of new Set(pages)) {
      if (pageNumber < 1 || pageNumber > doc.numPages) continue;
      const page = await doc.getPage(pageNumber);
      const base = page.getViewport({ scale: 1 });
      // ~1600 px wide: sharp enough for a 600 px crop of a photo, light on memory (iOS)
      const viewport = page.getViewport({ scale: Math.min(3, 1600 / base.width) });
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      const canvasContext = canvas.getContext("2d");
      if (!canvasContext) continue;
      await page.render({ canvasContext, viewport }).promise;
      out.set(pageNumber, canvas.toDataURL("image/jpeg", 0.9));
      page.cleanup();
    }
  } finally {
    await doc.destroy();
  }
  return out;
}

/**
 * Sends a PDF to the AI, then turns every extracted recipe into an app Recipe,
 * cropping the dish photo out of its PDF page when the AI located one.
 */
export async function parseRecipesFromPdf(
  file: File,
  userId: string,
  onProgress?: (message: string) => void
): Promise<Recipe[]> {
  if (file.size > MAX_PDF_MB * 1024 * 1024) {
    throw new Error(`PDF trop volumineux (${MAX_PDF_MB} Mo maximum). Exportez seulement les pages de la recette.`);
  }

  onProgress?.("Lecture du PDF par l'IA…");
  const formData = new FormData();
  formData.append("pdf", file);
  const res = await fetch("/api/ai/parse-recipe-pdf", { method: "POST", body: formData });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !Array.isArray(data.recipes)) {
    throw new Error(data?.error || "L'analyse du PDF a échoué.");
  }

  const raws: any[] = data.recipes;
  const photoPages = raws.map((r) => r.dishPhotoPage).filter((p): p is number => Number.isInteger(p));
  let pageImages = new Map<number, string>();
  if (photoPages.length > 0) {
    onProgress?.("Extraction des photos des plats…");
    try {
      pageImages = await renderPdfPages(file, photoPages);
    } catch (err) {
      // Photos are a bonus: the recipes are still imported without them
      console.warn("PDF page rendering failed:", err);
    }
  }

  const now = new Date().toISOString();
  return Promise.all(
    raws.map(async (raw, i) => {
      const page = raw.dishPhotoPage ? pageImages.get(raw.dishPhotoPage) : undefined;
      const imageUrl = page && raw.dishPhotoBox ? await cropAndRotateRegion(page, raw.dishPhotoBox, 0, true) : "";
      return {
        id: `pdf_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 7)}`,
        userId,
        title: raw.title,
        subtitle: raw.subtitle || undefined,
        category: raw.category || "Main Dishes",
        imageUrl,
        prepTimeMinutes: Number(raw.prepTimeMinutes) || 30,
        difficulty: ["Easy", "Medium", "Hard"].includes(raw.difficulty) ? raw.difficulty : "Easy",
        rating: 0,
        servingsBase: Number(raw.servingsBase) || DEFAULT_SERVINGS,
        spiceLevel: raw.spiceLevel || undefined,
        utensils: Array.isArray(raw.utensils) ? raw.utensils : [],
        nutrition: raw.nutrition || undefined,
        allergens: Array.isArray(raw.allergens) ? raw.allergens : [],
        ingredients: raw.ingredients.map((ing: any, idx: number) => ({
          id: ing.id || `ing_${idx + 1}`,
          name: String(ing.name || "").trim(),
          amount: Number(ing.amount) || 0,
          unit: ing.unit || "",
        })),
        steps: raw.steps.map((s: any, idx: number) => ({ ...s, stepNumber: idx + 1 })),
        createdAt: now,
        updatedAt: now,
      } satisfies Recipe;
    })
  );
}
