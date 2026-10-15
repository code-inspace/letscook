import { describe, expect, it } from "vitest";
import { applySuggestions, sanitizeSuggestions } from "../recalibration";

const ingredients = [
  { id: "1", name: "Riz", amount: 2, unit: "portion(s)" },
  { id: "2", name: "Crevettes", amount: 1, unit: "portion(s)" },
  { id: "3", name: "Oignon", amount: 1, unit: "pièce(s)" },
];

describe("sanitizeSuggestions", () => {
  it("keeps valid suggestions and drops out-of-range, duplicate and no-op ones", () => {
    const raw = {
      suggestions: [
        { index: 1, name: "Crevettes", amount: "400", unit: "g", reason: "Au poids" },
        { index: 0, name: "Riz basmati", amount: 300, unit: "g", reason: "75 g/pers." },
        { index: 0, name: "dup", amount: 1, unit: "kg" },
        { index: 9, name: "hors liste", amount: 1, unit: "g" },
        { index: 2, name: "Oignon", amount: 1, unit: "pièce(s)" },
        { index: 1.5, name: "x", amount: 1, unit: "g" },
      ],
    };
    expect(sanitizeSuggestions(raw, ingredients)).toEqual([
      { index: 0, name: "Riz basmati", amount: 300, unit: "g", reason: "75 g/pers." },
      { index: 1, name: "Crevettes", amount: 400, unit: "g", reason: "Au poids" },
    ]);
  });

  it("returns an empty list for malformed answers", () => {
    expect(sanitizeSuggestions({ nope: true }, ingredients)).toEqual([]);
    expect(sanitizeSuggestions(null, ingredients)).toEqual([]);
  });
});

describe("applySuggestions", () => {
  it("applies only accepted (possibly edited) suggestions", () => {
    const result = applySuggestions(ingredients, [
      { index: 0, name: "Riz basmati", amount: 280, unit: "g", reason: "", decision: "accepted" },
      { index: 1, name: "Crevettes", amount: 400, unit: "g", reason: "", decision: "rejected" },
      { index: 2, name: "Oignon jaune", amount: 2, unit: "pièce(s)", reason: "", decision: "pending" },
    ]);
    expect(result).toEqual([
      { id: "1", name: "Riz basmati", amount: 280, unit: "g" },
      ingredients[1],
      ingredients[2],
    ]);
  });
});
