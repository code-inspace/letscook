import { Recipe } from "@/features/recipes/types";

/**
 * Enhanced Plate Image Cutout using HTML5 Canvas:
 * Centers on the dish, applies a circular vignette mask with smooth transparent edges,
 * boosts saturation and vibrancy so it matches the floating cutout bowl style in the mockup.
 */
export async function enhanceAndCutoutDishPlate(
  imageSource: string | File
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    const finalize = () => {
      try {
        const size = Math.min(img.width, img.height);
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(typeof imageSource === "string" ? imageSource : URL.createObjectURL(imageSource));
          return;
        }

        const targetDim = 600;
        canvas.width = targetDim;
        canvas.height = targetDim;

        // Source crop box: focus on center where dish plate is located
        const sx = (img.width - size) / 2;
        const sy = (img.height - size) / 2;

        // 1. Create smooth circular clipping mask
        ctx.save();
        ctx.beginPath();
        const center = targetDim / 2;
        const radius = targetDim * 0.47;
        ctx.arc(center, center, radius, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();

        // 2. Enhance image vibrancy and contrast
        ctx.filter = "contrast(1.1) saturate(1.18) brightness(1.03)";
        ctx.drawImage(img, sx, sy, size, size, 0, 0, targetDim, targetDim);
        ctx.restore();

        // 3. Add soft subtle rim highlight
        ctx.save();
        ctx.beginPath();
        ctx.arc(center, center, radius, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.restore();

        resolve(canvas.toDataURL("image/png"));
      } catch (err) {
        console.warn("enhanceAndCutoutDishPlate canvas error:", err);
        resolve(typeof imageSource === "string" ? imageSource : URL.createObjectURL(imageSource));
      }
    };

    img.onload = finalize;
    img.onerror = () => {
      resolve(typeof imageSource === "string" ? imageSource : URL.createObjectURL(imageSource));
    };

    if (typeof imageSource === "string") {
      img.src = imageSource;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(imageSource);
    }
  });
}

/**
 * Intelligent Multi-Photo Recipe Album Parser:
 * Analyzes both Front dish photo and Back steps sheet from recipe kit cards.
 */
export async function parseRecipeAlbumWithAI(
  files: File[],
  userId: string = "guest-user",
  onProgress?: (status: string) => void
): Promise<Recipe> {
  onProgress?.("Envoi des photos à l'IA...");

  const formData = new FormData();
  files.forEach((file, i) => {
    formData.append(`file_${i}`, file);
  });

  onProgress?.("Analyse multimodale des ingrédients, étapes et du plat...");
  const response = await fetch("/api/ai/parse-recipe", {
    method: "POST",
    body: formData,
  });

  const data = await response.json();

  if (!response.ok || !data.recipe) {
    throw new Error(data.error || "Échec de l'extraction par l'IA");
  }

  onProgress?.("Détourage et amélioration visuelle du plat...");
  const mainImage = data.recipe.imageUrl || (files[0] ? URL.createObjectURL(files[0]) : "");
  const enhancedPlate = await enhanceAndCutoutDishPlate(mainImage);

  return {
    ...data.recipe,
    id: `rec_${Date.now()}`,
    userId,
    imageUrl: enhancedPlate,
    isFavorite: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
