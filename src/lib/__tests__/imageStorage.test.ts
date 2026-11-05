import { describe, expect, it } from "vitest";
import { applyImageMapping, isDataUrl, recipeHasInlineImages } from "../imageStorage";
import type { Recipe } from "@/features/recipes/types";

const base: Recipe = {
  id: "r1",
  userId: "me",
  title: "Dahl",
  category: "Main Dishes",
  imageUrl: "data:image/png;base64,AAAA",
  prepTimeMinutes: 45,
  difficulty: "Easy",
  rating: 0,
  servingsBase: 6,
  ingredients: [],
  steps: [
    { stepNumber: 1, title: "Riz", description: "Cuire", imageUrl: "data:image/jpeg;base64,BBBB" },
    { stepNumber: 2, title: "Dahl", description: "Mijoter", imageUrl: "https://cdn/x.jpg" },
  ],
  createdAt: "2026-11-01T00:00:00Z",
  updatedAt: "2026-11-01T00:00:00Z",
};

describe("image externalization helpers", () => {
  it("detects inline (base64) images", () => {
    expect(isDataUrl("data:image/png;base64,AAAA")).toBe(true);
    expect(isDataUrl("https://cdn/x.jpg")).toBe(false);
    expect(recipeHasInlineImages(base)).toBe(true);
    expect(recipeHasInlineImages({ ...base, imageUrl: "https://a", steps: [] })).toBe(false);
  });

  it("swaps uploaded images and keeps edits made during the upload", () => {
    const mapping = new Map([
      ["data:image/png;base64,AAAA", "https://storage/main.jpg"],
      ["data:image/jpeg;base64,BBBB", "https://storage/step1.jpg"],
    ]);
    // While uploading, the user replaced the main photo and renamed the recipe
    const edited = { ...base, title: "Palak dahl", imageUrl: "data:image/png;base64,NEW" };
    const result = applyImageMapping(edited, mapping);
    expect(result.title).toBe("Palak dahl");
    expect(result.imageUrl).toBe("data:image/png;base64,NEW");
    expect(result.steps[0].imageUrl).toBe("https://storage/step1.jpg");
    expect(result.steps[1].imageUrl).toBe("https://cdn/x.jpg");
  });
});
