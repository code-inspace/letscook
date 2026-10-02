import { Recipe, RecipeStep } from "@/features/recipes/types";

export interface AIParseResult {
  recipe: Recipe;
  logs: string[];
  provider?: string;
}

/**
 * Compresses and downscales image files on the client before sending to Vercel Serverless Functions.
 * Keeps image resolution crisp (max 1600px) while reducing file size from 5-10MB to <500KB.
 */
export async function compressImageForUpload(
  file: File,
  maxDimension: number = 1600,
  quality: number = 0.82
): Promise<File> {
  return new Promise((resolve) => {
    // If file is already tiny (< 400KB), return as is
    if (file.size < 400 * 1024) {
      return resolve(file);
    }

    try {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        let { width, height } = img;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(file);

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) return resolve(file);
            const fileName = file.name ? file.name.replace(/\.[^/.]+$/, ".jpg") : "photo.jpg";
            const compressedFile = new File([blob], fileName, {
              type: "image/jpeg",
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          "image/jpeg",
          quality
        );
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(file);
      };

      img.src = objectUrl;
    } catch {
      resolve(file);
    }
  });
}

/**
 * Loads an image from a File, Data URL, or Remote URL safely across all mobile browsers
 */
async function loadImageElement(source: string | File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    if (
      typeof source === "string" &&
      (source.startsWith("http://") || source.startsWith("https://"))
    ) {
      img.crossOrigin = "anonymous";
    }

    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Erreur de chargement d'image (HTMLImageElement)"));

    if (typeof source === "string") {
      img.src = source;
    } else {
      try {
        const objectUrl = URL.createObjectURL(source);
        img.src = objectUrl;
      } catch {
        const reader = new FileReader();
        reader.onload = (e) => {
          img.src = (e.target?.result as string) || "";
        };
        reader.onerror = () => reject(new Error("Erreur FileReader"));
        reader.readAsDataURL(source);
      }
    }
  });
}

/**
 * Crops and rotates a normalized region [ymin, xmin, ymax, xmax] (scale 0-1000) from an image.
 */
export async function cropAndRotateRegion(
  source: string | File,
  cropBox?: number[],
  rotationDegrees: number = 0,
  circular: boolean = false
): Promise<string> {
  try {
    const img = await loadImageElement(source);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return typeof source === "string" ? source : URL.createObjectURL(source);
    }

    const box = cropBox && cropBox.length === 4 ? cropBox : [0, 0, 1000, 1000];
    const [ymin, xmin, ymax, xmax] = box;

    const naturalWidth = img.naturalWidth || img.width || 800;
    const naturalHeight = img.naturalHeight || img.height || 600;

    const sx = Math.max(0, (xmin / 1000) * naturalWidth);
    const sy = Math.max(0, (ymin / 1000) * naturalHeight);
    const sWidth = Math.min(naturalWidth - sx, Math.max(10, ((xmax - xmin) / 1000) * naturalWidth));
    const sHeight = Math.min(naturalHeight - sy, Math.max(10, ((ymax - ymin) / 1000) * naturalHeight));

    const targetSize = 500;
    canvas.width = targetSize;
    canvas.height = targetSize;

    ctx.save();
    if (rotationDegrees !== 0) {
      ctx.translate(targetSize / 2, targetSize / 2);
      ctx.rotate((rotationDegrees * Math.PI) / 180);
      ctx.translate(-targetSize / 2, -targetSize / 2);
    }

    if (circular) {
      ctx.beginPath();
      const center = targetSize / 2;
      const radius = targetSize * 0.47;
      ctx.arc(center, center, radius, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
    }

    ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, targetSize, targetSize);
    ctx.restore();

    if (circular) {
      ctx.save();
      ctx.beginPath();
      const center = targetSize / 2;
      const radius = targetSize * 0.47;
      ctx.arc(center, center, radius, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.restore();
    }

    return canvas.toDataURL("image/jpeg", 0.85);
  } catch (err) {
    console.warn("cropAndRotateRegion fallback:", err);
    return typeof source === "string" ? source : URL.createObjectURL(source);
  }
}

/**
 * Generates an ultra-realistic 4K studio culinary photo for a recipe using free FLUX.1 inference
 */
export function generateStudioDishImageUrl(recipeTitle: string, ingredients: string[]): string {
  const ingrSummary = ingredients.slice(0, 4).join(", ");
  const promptText = encodeURIComponent(
    `gourmet top-down studio culinary photograph of ${recipeTitle}, made with ${ingrSummary}, served in a beautiful round ceramic bowl, appetizing colorful presentation, commercial food magazine 8k`
  );
  return `https://image.pollinations.ai/prompt/${promptText}?width=600&height=600&nologo=true&seed=${Math.floor(
    Math.random() * 10000
  )}`;
}

/**
 * Intelligent Multi-Photo Recipe Album Parser with auto-compression and detailed logging
 */
export async function parseRecipeAlbumWithAI(
  files: File[],
  userId: string = "guest-user",
  onProgress?: (status: string) => void
): Promise<AIParseResult> {
  const logs: string[] = [];
  const logClient = (msg: string) => {
    const timestamp = new Date().toISOString().substring(11, 19);
    logs.push(`[Client ${timestamp}] ${msg}`);
  };

  logClient(`Démarrage de l'analyse avec ${files.length} photo(s)`);
  files.forEach((f, i) => {
    logClient(`Photo ${i + 1} brute: ${f.name} (${(f.size / (1024 * 1024)).toFixed(2)} MB, ${f.type})`);
  });

  // 1. Auto-compress images client-side to ensure total payload is well under Vercel's 4.5MB limit
  onProgress?.("Optimisation & compression des photos pour l'IA...");
  logClient("Compression intelligente des photos (max 1600px, JPEG 82%)...");

  const compressedFiles: File[] = await Promise.all(
    files.map(async (file, idx) => {
      const initialSize = file.size;
      const compressed = await compressImageForUpload(file, 1600, 0.82);
      const newSize = compressed.size;
      logClient(
        `Photo ${idx + 1} optimisée: ${(initialSize / (1024 * 1024)).toFixed(2)} MB ➔ ${(newSize / (1024 * 1024)).toFixed(2)} MB (${Math.round((newSize / initialSize) * 100)}%)`
      );
      return compressed;
    })
  );

  const totalPayloadMb = (compressedFiles.reduce((acc, f) => acc + f.size, 0) / (1024 * 1024)).toFixed(2);
  logClient(`Poids total du payload réseau: ${totalPayloadMb} MB (limite Vercel: 4.5 MB)`);

  onProgress?.("Envoi des photos à l'IA multimodale...");

  const formData = new FormData();
  compressedFiles.forEach((file, i) => {
    formData.append(`file_${i}`, file);
  });

  onProgress?.("Analyse et détection des zones d'étapes et du plat...");

  let data: any;
  try {
    logClient("Appel HTTP POST vers /api/ai/parse-recipe...");
    const response = await fetch("/api/ai/parse-recipe", {
      method: "POST",
      body: formData,
    });

    logClient(`Réponse serveur reçue avec le status: ${response.status} ${response.statusText}`);

    const responseText = await response.text();

    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      logClient(`ERREUR: Réponse non-JSON du serveur (status ${response.status}): ${responseText.substring(0, 120)}`);
      if (response.status === 413) {
        throw new Error("Payload trop volumineux (HTTP 413). Les photos dépassent la limite autorisée.");
      }
      throw new Error(`Erreur serveur HTTP ${response.status}: ${responseText.substring(0, 80)}`);
    }

    if (Array.isArray(data?.logs)) {
      data.logs.forEach((sLog: string) => logs.push(sLog));
    }

    if (!response.ok || !data?.recipe) {
      logClient(`ERREUR Serveur: ${data?.error || "Réponse invalide"}`);
      const err = new Error(data?.error || "Erreur de traitement IA");
      (err as any).logs = logs;
      throw err;
    }
  } catch (err: any) {
    logClient(`ÉCHEC de la requête API: ${err?.message || err}`);
    if (!err.logs) err.logs = logs;
    throw err;
  }

  const rawRecipe = data.recipe;
  logClient(`Recette extraite: "${rawRecipe.title}" (${rawRecipe.ingredients?.length || 0} ingrédients, ${rawRecipe.steps?.length || 0} étapes)`);

  // 2. Extract and cutout Main Dish Image
  onProgress?.("Détourage et redressement du plat principal...");
  const frontIdx = Math.min(rawRecipe.frontPhotoIndex || 0, compressedFiles.length - 1);
  const frontFile = compressedFiles[frontIdx] || compressedFiles[0];
  const frontRotation = rawRecipe.frontPhotoRotation || 0;
  const dishCropBox = rawRecipe.mainDishCropBox || [150, 100, 800, 850];

  logClient(`Détourage plat principal (photo index ${frontIdx}, rotation ${frontRotation}°, cropBox: [${dishCropBox.join(",")}])`);
  let mainDishCutout = "";
  try {
    mainDishCutout = await cropAndRotateRegion(
      frontFile,
      dishCropBox,
      frontRotation,
      true
    );
    logClient("Détourage du plat principal réussi.");
  } catch (err) {
    logClient(`Avertissement détourage: ${err}`);
    mainDishCutout = URL.createObjectURL(frontFile);
  }

  // 3. Extract and crop EACH Step Photo from the steps sheet photo
  onProgress?.("Recadrage des photos pour chaque étape de cuisine...");
  const versoFile = compressedFiles.length > 1 ? compressedFiles[1] : compressedFiles[0];

  const enhancedSteps: RecipeStep[] = await Promise.all(
    (rawRecipe.steps || []).map(async (step: any, index: number) => {
      let stepImageUrl = step.imageUrl;

      if (versoFile && step.stepCropBox) {
        try {
          stepImageUrl = await cropAndRotateRegion(
            versoFile,
            step.stepCropBox,
            0,
            false
          );
        } catch {
          stepImageUrl = undefined;
        }
      }

      return {
        stepNumber: step.stepNumber || index + 1,
        title: step.title || `Étape ${index + 1}`,
        description: step.description || "",
        durationMinutes: step.durationMinutes,
        chefTip: step.chefTip,
        imageUrl: stepImageUrl,
      };
    })
  );

  logClient(`${enhancedSteps.length} étape(s) préparée(s) avec succès.`);

  const finalRecipe: Recipe = {
    ...rawRecipe,
    id: `rec_${Date.now()}`,
    userId,
    imageUrl: mainDishCutout || URL.createObjectURL(frontFile),
    steps: enhancedSteps,
    isFavorite: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return {
    recipe: finalRecipe,
    logs,
    provider: data.provider || "Vision AI",
  };
}
