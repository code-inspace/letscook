/** [ymin, xmin, ymax, xmax] on a 0-1000 scale, as returned by Gemini. */
export type CropBox = [number, number, number, number];

export function isCropBox(value: unknown): value is CropBox {
  return (
    Array.isArray(value) &&
    value.length === 4 &&
    value.every((n) => typeof n === "number" && Number.isFinite(n)) &&
    value[0] < value[2] &&
    value[1] < value[3]
  );
}

/**
 * Meal-kit sites print the recipe title over the bottom of the hero photo, and
 * the model's dish box tends to include it. When the title overlaps the lower
 * part of the dish box, stop the box just above the title.
 */
export function clampDishBoxAboveTitle(dishBox: unknown, titleBox: unknown): CropBox | null {
  if (!isCropBox(dishBox)) return null;
  if (!isCropBox(titleBox)) return dishBox;
  const [dy0, dx0, dy1, dx1] = dishBox;
  const [ty0, tx0, ty1, tx1] = titleBox;
  const overlapsHorizontally = tx0 < dx1 && tx1 > dx0;
  const titleStartsInsideDish = ty0 > dy0 && ty0 < dy1;
  // Only cut when enough of the dish remains above the title (title is an overlay at the bottom)
  const enoughDishAbove = ty0 - dy0 >= (dy1 - dy0) * 0.35;
  if (!overlapsHorizontally || !titleStartsInsideDish || !enoughDishAbove) return dishBox;
  return [dy0, dx0, Math.max(dy0 + 1, ty0 - 4), dx1];
}
