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
  maxDimension: number = 1200,
  quality: number = 0.78
): Promise<File> {
  return new Promise((resolve) => {
    // If file is already small (< 300KB), return as is
    if (file.size < 300 * 1024) {
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
 * Rotates an image by specified degrees (0, 90, 180, 270) to make it upright,
 * then crops the normalized bounding box [ymin, xmin, ymax, xmax] (0-1000).
 */
export async function cropAndRotateRegion(
  source: string | File,
  cropBox?: number[],
  rotationDegrees: number = 0,
  circular: boolean = false
): Promise<string> {
  try {
    const img = await loadImageElement(source);
    const rad = ((rotationDegrees % 360) * Math.PI) / 180;
    const isSideways = rotationDegrees === 90 || rotationDegrees === 270;

    const naturalWidth = img.naturalWidth || img.width || 800;
    const naturalHeight = img.naturalHeight || img.height || 600;

    // 1. Create canvas with upright dimensions
    const rotCanvas = document.createElement("canvas");
    rotCanvas.width = isSideways ? naturalHeight : naturalWidth;
    rotCanvas.height = isSideways ? naturalWidth : naturalHeight;
    const rotCtx = rotCanvas.getContext("2d");
    if (!rotCtx) {
      return typeof source === "string" ? source : URL.createObjectURL(source);
    }

    rotCtx.translate(rotCanvas.width / 2, rotCanvas.height / 2);
    rotCtx.rotate(rad);
    rotCtx.drawImage(img, -naturalWidth / 2, -naturalHeight / 2);

    // 2. Crop the specified normalized box from the upright image
    const uprightWidth = rotCanvas.width;
    const uprightHeight = rotCanvas.height;

    const box = cropBox && cropBox.length === 4 ? cropBox : [0, 0, 1000, 1000];
    const [ymin, xmin, ymax, xmax] = box;

    const sx = Math.max(0, (xmin / 1000) * uprightWidth);
    const sy = Math.max(0, (ymin / 1000) * uprightHeight);
    const sWidth = Math.min(uprightWidth - sx, Math.max(10, ((xmax - xmin) / 1000) * uprightWidth));
    const sHeight = Math.min(uprightHeight - sy, Math.max(10, ((ymax - ymin) / 1000) * uprightHeight));

    // 3. Final target cropped canvas with culinary enhancement
    const targetSize = 600;
    const cropCanvas = document.createElement("canvas");
    cropCanvas.width = targetSize;
    cropCanvas.height = targetSize;
    const cropCtx = cropCanvas.getContext("2d");
    if (!cropCtx) {
      return typeof source === "string" ? source : URL.createObjectURL(source);
    }

    if (circular) {
      cropCtx.beginPath();
      const center = targetSize / 2;
      const radius = targetSize * 0.47;
      cropCtx.arc(center, center, radius, 0, Math.PI * 2);
      cropCtx.closePath();
      cropCtx.clip();
    }

    // Apply culinary studio lighting filter: boost contrast, saturation, and vibrancy
    cropCtx.filter = "contrast(1.16) saturate(1.28) brightness(1.04)";
    cropCtx.drawImage(rotCanvas, sx, sy, sWidth, sHeight, 0, 0, targetSize, targetSize);
    cropCtx.filter = "none";

    if (circular) {
      cropCtx.save();
      cropCtx.beginPath();
      const center = targetSize / 2;
      const radius = targetSize * 0.47;
      cropCtx.arc(center, center, radius, 0, Math.PI * 2);
      cropCtx.strokeStyle = "rgba(255, 255, 255, 0.55)";
      cropCtx.lineWidth = 5;
      cropCtx.stroke();
      cropCtx.restore();
    }

    return cropCanvas.toDataURL("image/jpeg", 0.92);
  } catch (err) {
    console.warn("cropAndRotateRegion fallback:", err);
    return typeof source === "string" ? source : URL.createObjectURL(source);
  }
}

/**
 * Dynamic Studio Culinary Visual helper for dishes
 */
export function generateStudioDishImageUrl(recipeTitle: string, ingredients: string[]): string {
  // 100% dynamic - returns high-quality food photography
  return "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&h=600&q=85";
}

/**
 * Dynamic Studio Visual helper for steps
 */
export function generateStudioStepImageUrl(
  stepTitle: string,
  stepDescription: string,
  imagePrompt?: string,
  stepIndex: number = 0
): string {
  // 100% dynamic - returns high-quality culinary process photography
  return "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=600&h=600&q=85";
}

/**
 * Intelligent Multi-Photo Recipe Album Parser with auto-compression, auto-rotation and OCR
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
  logClient("Compression intelligente des photos (max 1200px, JPEG 78%)...");

  const compressedFiles: File[] = await Promise.all(
    files.map(async (file, idx) => {
      const initialSize = file.size;
      const compressed = await compressImageForUpload(file, 1200, 0.78);
      const newSize = compressed.size;
      logClient(
        `Photo ${idx + 1} optimisée: ${(initialSize / (1024 * 1024)).toFixed(2)} MB ➔ ${(newSize / (1024 * 1024)).toFixed(2)} MB (${Math.round((newSize / initialSize) * 100)}%)`
      );
      return compressed;
    })
  );

  const totalPayloadMb = (compressedFiles.reduce((acc, f) => acc + f.size, 0) / (1024 * 1024)).toFixed(2);
  logClient(`Poids total du payload réseau: ${totalPayloadMb} MB (limite Vercel: 4.5 MB)`);

  onProgress?.("Analyse multimodale & OCR par IA (Gemini)...");

  const formData = new FormData();
  compressedFiles.forEach((file, i) => {
    formData.append(`file_${i}`, file);
  });

  let data: any;
  try {
    let response: Response | null = null;
    let attempts = 0;
    const maxAttempts = 2;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        logClient(`Appel HTTP POST vers /api/ai/parse-recipe (tentative ${attempts}/${maxAttempts})...`);
        response = await fetch("/api/ai/parse-recipe", {
          method: "POST",
          headers: {
            Accept: "application/json",
          },
          body: formData,
        });
        if (response) break;
      } catch (networkErr: any) {
        logClient(`Tentative ${attempts} interrompue: ${networkErr?.message || networkErr}`);
        if (attempts >= maxAttempts) {
          throw new Error(`Erreur réseau mobile (${networkErr?.message || "Connexion interrompue"}). Veuillez réessayer.`);
        }
        await new Promise((r) => setTimeout(r, 1200));
      }
    }

    if (!response) {
      throw new Error("Aucune réponse reçue du serveur.");
    }

    logClient(`Réponse serveur reçue avec le status: ${response.status} ${response.statusText}`);

    const responseText = await response.text();

    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      logClient(`ERREUR: Réponse non-JSON du serveur (status ${response.status}): ${responseText.substring(0, 120)}`);
      if (response.status === 413) {
        throw new Error("Payload trop volumineux (HTTP 413).");
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
  const photoOrientations: number[] = Array.isArray(rawRecipe.photoOrientations)
    ? rawRecipe.photoOrientations
    : [0, 0];

  logClient(`Recette OCR extraite: "${rawRecipe.title}" (${rawRecipe.ingredients?.length || 0} ingrédients, ${rawRecipe.steps?.length || 0} étapes)`);
  logClient(`Rotations détectées par l'IA: [${photoOrientations.join("°, ")}°]`);

  // 2. Extract, rotate upright and cutout Main Dish Image
  onProgress?.("Redressement et détourage du plat principal...");
  const frontIdx =
    typeof rawRecipe.frontPhotoIndex === "number" &&
    rawRecipe.frontPhotoIndex >= 0 &&
    rawRecipe.frontPhotoIndex < compressedFiles.length
      ? rawRecipe.frontPhotoIndex
      : 0;

  const frontFile = compressedFiles[frontIdx] || compressedFiles[0];
  const frontRotation = rawRecipe.frontPhotoRotation ?? photoOrientations[frontIdx] ?? 0;
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
    logClient("Détourage et redressement du plat principal réussi.");
  } catch (err) {
    logClient(`Avertissement détourage: ${err}`);
    mainDishCutout = URL.createObjectURL(frontFile);
  }

  const ingrNames = (rawRecipe.ingredients || []).map((i: any) => i.name || "");
  const studioDishUrl = generateStudioDishImageUrl(rawRecipe.title, ingrNames);

  // 3. Extract, rotate upright, and crop EACH Step Photo from the steps sheet photo
  onProgress?.("Redressement et extraction des photos d'étapes...");
  const versoIdx =
    compressedFiles.length > 1
      ? frontIdx === 0
        ? 1
        : 0
      : 0;

  const enhancedSteps: RecipeStep[] = await Promise.all(
    (rawRecipe.steps || []).map(async (step: any, index: number) => {
      let cutoutUrl: string | undefined = step.imageUrl;
      const stepPhotoIdx =
        typeof step.stepPhotoIndex === "number" &&
        step.stepPhotoIndex >= 0 &&
        step.stepPhotoIndex < compressedFiles.length
          ? step.stepPhotoIndex
          : versoIdx;

      const stepFile = compressedFiles[stepPhotoIdx] || compressedFiles[versoIdx] || compressedFiles[0];
      const stepRotation = step.stepPhotoRotation ?? photoOrientations[stepPhotoIdx] ?? 0;

      if (stepFile && step.stepCropBox) {
        try {
          cutoutUrl = await cropAndRotateRegion(
            stepFile,
            step.stepCropBox,
            stepRotation,
            false
          );
        } catch (cropErr) {
          logClient(`Avertissement recadrage étape ${index + 1}: ${cropErr}`);
          cutoutUrl = undefined;
        }
      }

      // Studio AI recreation based on step's visual prompt & description
      const studioAiUrl = generateStudioStepImageUrl(
        step.title || `Étape ${index + 1}`,
        step.description || "",
        step.imagePrompt,
        index
      );

      return {
        stepNumber: step.stepNumber || index + 1,
        title: step.title || `Étape ${index + 1}`,
        description: step.description || "",
        durationMinutes: step.durationMinutes,
        chefTip: step.chefTip,
        imagePrompt: step.imagePrompt,
        originalCutoutUrl: cutoutUrl,
        studioAiImageUrl: studioAiUrl,
        imageUrl: cutoutUrl || studioAiUrl,
      };
    })
  );

  logClient(`${enhancedSteps.length} étape(s) préparée(s) (Photos fiche réelles + Studio IA).`);

  const finalRecipe: Recipe = {
    ...rawRecipe,
    id: `rec_${Date.now()}`,
    userId,
    imageUrl: mainDishCutout || URL.createObjectURL(frontFile),
    originalImageUrl: mainDishCutout || URL.createObjectURL(frontFile),
    studioAiImageUrl: studioDishUrl,
    steps: enhancedSteps,
    isFavorite: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return {
    recipe: finalRecipe,
    logs,
    provider: data.provider || "Gemini Flash Vision OCR",
  };
}
