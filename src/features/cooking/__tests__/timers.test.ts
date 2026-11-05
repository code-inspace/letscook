import { describe, expect, it } from "vitest";
import { extractDurations, formatRemaining } from "../timers";

describe("extractDurations", () => {
  it("finds the durations written in a step", () => {
    expect(
      extractDurations(
        "Faites-y revenir la moitié de l'oignon et l'ail 3-4 min. Remuez et faites cuire 1 min de plus. Couvrez et laissez mijoter 25-30 min."
      )
    ).toEqual([3, 1, 25]);
    expect(extractDurations("Incorporez le riz, puis faites cuire 12-15 min à couvert.")).toEqual([12]);
    expect(extractDurations("Laissez reposer 1 h 30 puis enfournez 20 minutes")).toEqual([90, 20]);
    expect(extractDurations("Laissez lever 2 heures")).toEqual([120]);
    expect(extractDurations("Cuire 5 à 6 minutes de chaque côté")).toEqual([5]);
  });

  it("ignores text without durations", () => {
    expect(extractDurations("Servez le riz dans des assiettes creuses.")).toEqual([]);
    expect(extractDurations("Ajoutez 200 g de farine et 2 œufs")).toEqual([]);
    expect(extractDurations(undefined)).toEqual([]);
  });
});

describe("formatRemaining", () => {
  it("formats a countdown", () => {
    expect(formatRemaining(12 * 60_000)).toBe("12:00");
    expect(formatRemaining(65_000)).toBe("1:05");
    expect(formatRemaining(90 * 60_000)).toBe("1:30:00");
    expect(formatRemaining(-5)).toBe("0:00");
  });
});
