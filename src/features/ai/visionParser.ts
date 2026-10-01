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
    try {
      const fallbackUrl =
        typeof imageSource === "string"
          ? imageSource
          : URL.createObjectURL(imageSource);

      const img = new Image();
      img.crossOrigin = "anonymous";

      const finalize = () => {
        try {
          if (!img.width || !img.height) {
            resolve(fallbackUrl);
            return;
          }

          const size = Math.min(img.width, img.height);
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(fallbackUrl);
            return;
          }

          const targetDim = 600;
          canvas.width = targetDim;
          canvas.height = targetDim;

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
          try {
            ctx.filter = "contrast(1.1) saturate(1.18) brightness(1.03)";
          } catch {}

          ctx.drawImage(img, sx, sy, size, size, 0, 0, targetDim, targetDim);
          ctx.restore();

          // 3. Subtle rim highlight
          ctx.save();
          ctx.beginPath();
          ctx.arc(center, center, radius, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
          ctx.lineWidth = 4;
          ctx.stroke();
          ctx.restore();

          resolve(canvas.toDataURL("image/png"));
        } catch (err) {
          console.warn("enhanceAndCutoutDishPlate canvas error, returning fallback:", err);
          resolve(fallbackUrl);
        }
      };

      img.onload = finalize;
      img.onerror = () => resolve(fallbackUrl);

      if (typeof imageSource === "string") {
        img.src = imageSource;
      } else {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (typeof e.target?.result === "string") {
            img.src = e.target.result;
          } else {
            resolve(fallbackUrl);
          }
        };
        reader.onerror = () => resolve(fallbackUrl);
        reader.readAsDataURL(imageSource);
      }
    } catch (err) {
      console.warn("enhanceAndCutoutDishPlate global error:", err);
      resolve(
        typeof imageSource === "string"
          ? imageSource
          : URL.createObjectURL(imageSource)
      );
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

  onProgress?.("Détourage et amélioration visuelle du plat...");
  const mainImage =
    data.recipe.imageUrl || (files[0] ? URL.createObjectURL(files[0]) : "");
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
