import { createClient } from "@/utils/supabase/client";
import type { Recipe } from "@/features/recipes/types";

/**
 * Recipe photos used to be stored as base64 data URLs inside the recipe rows
 * (1-2 MB each): slow sync, heavy offline cache. They are now uploaded to the
 * public "recipe-images" Supabase Storage bucket and referenced by URL, which
 * the service worker caches like any image.
 */
export const RECIPE_IMAGES_BUCKET = "recipe-images";
const MAX_SIDE = 1200;

// Set when the bucket is missing / not allowed: stop retrying for this session
let storageUnavailable = false;

export const isDataUrl = (url?: string | null): url is string =>
  typeof url === "string" && url.startsWith("data:image/");

async function dataUrlToJpeg(dataUrl: string): Promise<Blob> {
  const source = await (await fetch(dataUrl)).blob();
  try {
    const bitmap = await createImageBitmap(source);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return source;
    ctx.fillStyle = "#fff"; // transparent PNG → white, not black, in JPEG
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    const jpeg = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    return jpeg && jpeg.size < source.size ? jpeg : source;
  } catch {
    return source;
  }
}

async function contentHash(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest).slice(0, 12))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Uploads a data URL and returns its public URL, or null if Storage is not usable. */
export async function uploadDataUrl(userId: string, dataUrl: string): Promise<string | null> {
  if (storageUnavailable || !isDataUrl(dataUrl) || typeof window === "undefined") return null;
  try {
    const blob = await dataUrlToJpeg(dataUrl);
    const ext = blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg";
    // Same image → same path: re-saving a recipe never duplicates files
    const path = `${userId}/${await contentHash(dataUrl)}.${ext}`;
    const storage = createClient().storage.from(RECIPE_IMAGES_BUCKET);
    const { error } = await storage.upload(path, blob, {
      contentType: blob.type || "image/jpeg",
      cacheControl: "31536000",
      upsert: true,
    });
    if (error) {
      const msg = `${(error as any).statusCode ?? ""} ${error.message}`;
      if (/not found|bucket|403|401|row-level security|unauthorized/i.test(msg)) storageUnavailable = true;
      console.warn("Image upload failed, keeping the inline image:", error.message);
      return null;
    }
    return storage.getPublicUrl(path).data.publicUrl;
  } catch (err) {
    console.warn("Image upload failed, keeping the inline image:", err);
    return null;
  }
}

export function recipeHasInlineImages(recipe: Recipe): boolean {
  return (
    isDataUrl(recipe.imageUrl) ||
    isDataUrl(recipe.originalImageUrl) ||
    isDataUrl(recipe.studioAiImageUrl) ||
    (recipe.steps || []).some(
      (s) => isDataUrl(s.imageUrl) || isDataUrl(s.originalCutoutUrl) || isDataUrl(s.studioAiImageUrl)
    )
  );
}

/** Uploads every base64 image of the recipe; returns data URL → Storage URL. */
export async function uploadInlineImages(userId: string, recipe: Recipe): Promise<Map<string, string>> {
  const mapping = new Map<string, string>();
  if (storageUnavailable || !recipeHasInlineImages(recipe)) return mapping;
  const urls = new Set<string>(
    [
      recipe.imageUrl,
      recipe.originalImageUrl,
      recipe.studioAiImageUrl,
      ...(recipe.steps || []).flatMap((s) => [s.imageUrl, s.originalCutoutUrl, s.studioAiImageUrl]),
    ].filter(isDataUrl)
  );
  for (const url of urls) {
    const uploaded = await uploadDataUrl(userId, url);
    if (uploaded) mapping.set(url, uploaded);
    else if (storageUnavailable) break;
  }
  return mapping;
}

/**
 * Swaps uploaded images in (the latest version of) a recipe. Only fields that
 * still hold the uploaded data URL change, so edits made meanwhile are kept.
 */
export function applyImageMapping(recipe: Recipe, mapping: Map<string, string>): Recipe {
  if (mapping.size === 0) return recipe;
  const swap = <T extends string | undefined>(url: T): T => ((url && mapping.get(url)) as T) || url;
  return {
    ...recipe,
    imageUrl: swap(recipe.imageUrl),
    originalImageUrl: swap(recipe.originalImageUrl),
    studioAiImageUrl: swap(recipe.studioAiImageUrl),
    steps: (recipe.steps || []).map((s) => ({
      ...s,
      imageUrl: swap(s.imageUrl),
      originalCutoutUrl: swap(s.originalCutoutUrl),
      studioAiImageUrl: swap(s.studioAiImageUrl),
    })),
  };
}
