import { describe, it, expect } from "vitest";
import { Ingredient, Recipe } from "../types";

describe("Recipe Portions & Ingredients Scaling", () => {
  const sampleIngredients: Ingredient[] = [
    { id: "ing-1", name: "Navet", amount: 4, unit: "pièce(s)" },
    { id: "ing-2", name: "Riz", amount: 450, unit: "g" },
    { id: "ing-3", name: "Farce au porc", amount: 2, unit: "paquet(s)" },
  ];

  const baseServings = 4;

  it("should calculate exact scaled amounts when portions change from 4 to 2 persons", () => {
    const targetServings = 2;
    const factor = targetServings / baseServings; // 0.5

    const scaled = sampleIngredients.map((ing) => ({
      ...ing,
      amount: Math.round(ing.amount * factor * 10) / 10,
    }));

    expect(scaled[0].amount).toBe(2);
    expect(scaled[1].amount).toBe(225);
    expect(scaled[2].amount).toBe(1);
  });

  it("should calculate scaled amounts when portions increase from 4 to 6 persons", () => {
    const targetServings = 6;
    const factor = targetServings / baseServings; // 1.5

    const scaled = sampleIngredients.map((ing) => ({
      ...ing,
      amount: Math.round(ing.amount * factor * 10) / 10,
    }));

    expect(scaled[0].amount).toBe(6);
    expect(scaled[1].amount).toBe(675);
    expect(scaled[2].amount).toBe(3);
  });
});
