import { Recipe, RecipeStep } from "@/features/recipes/types";

/**
 * Loads an image from a File, Data URL, or Remote URL safely across all mobile browsers (especially Safari WebKit)
 */
async function loadImageElement(source: string | File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    // Only set crossOrigin for remote http(s) URLs
    if (
      typeof source === "string" &&
      (source.startsWith("http://") || source.startsWith("https://"))
    ) {
      img.crossOrigin = "anonymous";
    }

    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Erreur de chargement d'image"));

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
  cropBox?: number[], // [ymin, xmin, ymax, xmax] in 0-1000 scale
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
 * Intelligent Multi-Photo Recipe Album Parser
 */
export async function parseRecipeAlbumWithAI(
  files: File[],
  userId: string = "guest-user",
  onProgress?: (status: string) => void
): Promise<Recipe> {
  onProgress?.("Envoi des photos à l'IA multimodale...");

  const formData = new FormData();
  files.forEach((file, i) => {
    formData.append(`file_${i}`, file);
  });

  onProgress?.("Analyse et détection des zones d'étapes et du plat...");

  let data: any;
  try {
    const response = await fetch("/api/ai/parse-recipe", {
      method: "POST",
      body: formData,
    });

    data = await response.json();

    if (!response.ok || !data?.recipe) {
      throw new Error(data?.error || "Erreur de traitement IA");
    }
  } catch (err: any) {
    console.warn("Server AI parsing error:", err);
    throw new Error(err?.message || "Impossible d'extraire la recette.");
  }

  const rawRecipe = data.recipe;

  // 1. Extract and cutout Main Dish Image
  onProgress?.("Détourage et redressement du plat principal...");
  const frontIdx = Math.min(rawRecipe.frontPhotoIndex || 0, files.length - 1);
  const frontFile = files[frontIdx] || files[0];
  const frontRotation = rawRecipe.frontPhotoRotation || 0;
  const dishCropBox = rawRecipe.mainDishCropBox || [150, 100, 800, 850];

  let mainDishCutout = "";
  try {
    mainDishCutout = await cropAndRotateRegion(
      frontFile,
      dishCropBox,
      frontRotation,
      true
    );
  } catch (err) {
    console.warn("Cutout fallback error:", err);
    mainDishCutout = URL.createObjectURL(frontFile);
  }

  // 2. Extract and crop EACH Step Photo from the steps sheet photo
  onProgress?.("Recadrage des photos pour chaque étape de cuisine...");
  const versoFile = files.length > 1 ? files[1] : files[0];

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

  return {
    ...rawRecipe,
    id: `rec_${Date.now()}`,
    userId,
    imageUrl: mainDishCutout || URL.createObjectURL(frontFile),
    steps: enhancedSteps,
    isFavorite: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
