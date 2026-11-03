import { describe, expect, it } from "vitest";
import { clampDishBoxAboveTitle } from "../cropBoxes";
import { cleanNutrition } from "../nutrition";

describe("clampDishBoxAboveTitle", () => {
  it("stops the dish box above a title overlaid on the bottom of the hero photo", () => {
    // HelloFresh hero: dish 10→253, title overlay from 186
    expect(clampDishBoxAboveTitle([10, 0, 253, 1000], [186, 20, 232, 920])).toEqual([10, 0, 182, 1000]);
  });

  it("keeps the box when there is no title, or the title is elsewhere", () => {
    expect(clampDishBoxAboveTitle([10, 0, 253, 1000], null)).toEqual([10, 0, 253, 1000]);
    expect(clampDishBoxAboveTitle([300, 0, 600, 1000], [100, 0, 150, 1000])).toEqual([300, 0, 600, 1000]);
    // Title at the very top of the box: cutting there would remove the dish
    expect(clampDishBoxAboveTitle([100, 0, 600, 1000], [120, 0, 160, 1000])).toEqual([100, 0, 600, 1000]);
  });

  it("returns null for an invalid dish box", () => {
    expect(clampDishBoxAboveTitle([5, 5, 1], null)).toBeNull();
    expect(clampDishBoxAboveTitle([500, 0, 100, 1000], null)).toBeNull();
  });
});

describe("cleanNutrition", () => {
  it("keeps only the values read on the page", () => {
    expect(
      cleanNutrition({ caloriesKcal: 1044, proteines: "30.7g", glucides: null, lipides: "", fibres: "--", sel: "null" })
    ).toEqual({ caloriesKcal: 1044, proteines: "30.7g" });
  });

  it("normalises bare numbers and drops empty nutrition", () => {
    expect(cleanNutrition({ caloriesKcal: "650 kcal", glucides: "75" })).toEqual({ caloriesKcal: 650, glucides: "75g" });
    expect(cleanNutrition({ caloriesKcal: null })).toBeUndefined();
    expect(cleanNutrition(null)).toBeUndefined();
  });
});
