import { describe, expect, it } from "vitest";
import {
  formatQuantities,
  ingredientDisplayName,
  ingredientId,
  ingredientKey,
  pickDisplayName,
  sumQuantities,
} from "../canonical";

const same = (...names: string[]) => {
  const keys = names.map(ingredientKey);
  expect(new Set(keys).size, `${names.join(" / ")} → ${keys.join(" / ")}`).toBe(1);
};
const different = (a: string, b: string) => expect(ingredientKey(a)).not.toBe(ingredientKey(b));

describe("ingredientKey — merges", () => {
  it("merges the reported duplicates", () => {
    same("à soupe de thym", "Thym", "c. à soupe de thym", "Thym frais", "2 brins de thym");
    same("ail", "Gousse d'ail", "2 gousses d'ail", "Ail haché", "Gousses d’ail");
    same("Purée de gingembre", "gingembre", "Gingembre frais râpé");
    same("bouillon légumes", "Bouillons cubes légumes", "Bouillon de légumes", "1 cube de bouillon de légumes");
    same("à café de coriandre", "Coriandre", "coriandre fraîche ciselée");
    same("Champignon", "Champignons de Paris", "champignons de paris émincés");
  });

  it("ignores quantities, units, articles, accents and plurals", () => {
    same("Oignons", "1 oignon", "un oignon émincé", "Oignon jaune");
    same("500 g de farine", "Farine", "de la farine");
    same("Échalote", "échalotes", "2 échalotes ciselées");
    same("Lait de coco", "lait de coco (Contient : rien)");
    same("Poireaux", "poireau");
    same("Et 1 navet", "Navet", "+ 2 navets");
    same("Bouillon de bœuf", "Bouillon de boeuf");
    same("Œufs", "oeuf", "2 œufs");
  });
});

describe("ingredientKey — keeps different products apart", () => {
  it("does not merge distinct products", () => {
    different("Pomme de terre", "Pomme");
    different("Noix de coco", "Noix");
    different("Crème fraîche", "Crème liquide");
    different("Fromage frais", "Fromage");
    different("Tomates séchées", "Tomate");
    different("Concentré de tomate", "Tomate");
    same("à café de concentré de tomates", "Concentré de tomates", "concentré de tomate");
    different("Pâte d'amande", "Amande");
    different("Poivron", "Poivre");
    different("Lait de coco", "Lait");
  });
});

describe("ids and display names", () => {
  it("builds stable catalog ids and clean names", () => {
    expect(ingredientId("Bouillons cubes légumes")).toBe("ing_bouillon_legume");
    expect(ingredientId("2 gousses d'ail")).toBe("ing_ail");
    expect(ingredientDisplayName("2 gousses d'ail")).toBe("Ail");
    expect(ingredientDisplayName("Purée de gingembre")).toBe("Gingembre");
    expect(pickDisplayName(["Champignons de Paris", "champignon"])).toBe("Champignon");
    expect(pickDisplayName(["Bouillon cube légumes", "Bouillon de légumes", "Cube de bouillon de légumes"])).toBe(
      "Bouillon de légumes"
    );
    expect(ingredientDisplayName("à café de concentré de tomates")).toBe("Concentré de tomates");
    // Articles are only removed as whole words
    expect(ingredientDisplayName("Lait")).toBe("Lait");
    expect(ingredientDisplayName("Lentilles vertes")).toBe("Lentilles vertes");
    expect(ingredientDisplayName("Légumes")).toBe("Légumes");
    expect(ingredientDisplayName("Lardons")).toBe("Lardons");
    expect(ingredientDisplayName("Desserts")).toBe("Desserts");
    expect(ingredientKey("Dés de jambon")).toBe(ingredientKey("Jambon"));
  });
});

describe("sumQuantities", () => {
  it("adds compatible units and keeps the others separate", () => {
    expect(
      formatQuantities(
        sumQuantities([
          { amount: 2, unit: "gousse(s)" },
          { amount: 1, unit: "gousses" },
          { amount: 10, unit: "g" },
        ])
      )
    ).toBe("3 gousse(s) + 10 g");
  });

  it("converts kg/g and L/cl", () => {
    expect(sumQuantities([{ amount: 500, unit: "g" }, { amount: 1, unit: "kg" }])).toEqual([
      { amount: 1.5, unit: "kg" },
    ]);
    expect(sumQuantities([{ amount: 20, unit: "cl" }, { amount: 300, unit: "ml" }])).toEqual([
      { amount: 500, unit: "ml" },
    ]);
    expect(sumQuantities([{ amount: 1, unit: "c. à soupe" }, { amount: 2, unit: "cs" }])).toEqual([
      { amount: 3, unit: "c. à soupe" },
    ]);
  });

  it("ignores missing quantities", () => {
    expect(sumQuantities([{ amount: 0, unit: "" }, { amount: null, unit: null }])).toEqual([]);
  });
});
