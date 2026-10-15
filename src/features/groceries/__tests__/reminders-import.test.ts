import { describe, expect, it, vi } from "vitest";

vi.stubGlobal("window", new EventTarget());

describe("parseRemindersText", () => {
  it("parses quantities, units, bullets and our own export format", async () => {
    const { parseRemindersText } = await import("../remindersImport");
    const text = [
      "🛒 Liste de courses Let's Cook :",
      "",
      "• 2 kg Pommes de terre (Gratin)",
      "- lait",
      "500 g de farine",
      "3 œufs",
      "1,5 l d'eau",
      "Pain",
    ].join("\n");
    expect(parseRemindersText(text, [])).toEqual([
      { name: "Pommes de terre", amount: 2, unit: "kg", duplicate: false },
      { name: "Lait", amount: null, unit: null, duplicate: false },
      { name: "Farine", amount: 500, unit: "g", duplicate: false },
      { name: "Œufs", amount: 3, unit: null, duplicate: false },
      { name: "Eau", amount: 1.5, unit: "l", duplicate: false },
      { name: "Pain", amount: null, unit: null, duplicate: false },
    ]);
  });

  it("flags items already in the open list and drops repeated lines", async () => {
    const { parseRemindersText } = await import("../remindersImport");
    const existing = [
      { id: "a", userId: "me", name: "Tomates", checked: false, isCustom: true, createdAt: "" },
      { id: "b", userId: "me", name: "Beurre", checked: true, isCustom: true, createdAt: "" },
    ];
    const parsed = parseRemindersText("tomate\nTomates\nbeurre", existing);
    expect(parsed.map((p) => [p.name, p.duplicate])).toEqual([
      ["Tomate", true],
      ["Beurre", false],
    ]);
  });
});
