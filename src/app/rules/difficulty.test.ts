import { describe, expect, it } from "vitest";
import { calculateEncounterDifficulty } from "./difficulty";

describe("encounter difficulty", () => {
  it("classifies a medium encounter", () => {
    const result = calculateEncounterDifficulty([3, 3, 3, 3], [700]);
    expect(result.difficulty).toBe("medium");
  });

  it("classifies a deadly encounter", () => {
    const result = calculateEncounterDifficulty([1, 1, 1, 1], [100, 100, 100]);
    expect(result.difficulty).toBe("deadly");
  });
});
