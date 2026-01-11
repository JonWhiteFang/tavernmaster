import { describe, expect, it } from "vitest";
import {
  calculateEncounterDifficulty,
  crToXp,
  getEncounterMultiplier,
  getThresholdsForParty
} from "./difficulty";

describe("encounter difficulty", () => {
  it("classifies a medium encounter", () => {
    const result = calculateEncounterDifficulty([3, 3, 3, 3], [700]);
    expect(result.difficulty).toBe("medium");
  });

  it("classifies a deadly encounter", () => {
    const result = calculateEncounterDifficulty([1, 1, 1, 1], [100, 100, 100]);
    expect(result.difficulty).toBe("deadly");
  });

  it("classifies an easy encounter", () => {
    const result = calculateEncounterDifficulty([5, 5, 5, 5], [50]);
    expect(result.difficulty).toBe("easy");
  });

  it("classifies a hard encounter", () => {
    const result = calculateEncounterDifficulty([3, 3, 3, 3], [1400]);
    expect(result.difficulty).toBe("hard");
  });

  it("converts CR to XP", () => {
    expect(crToXp("0")).toBe(10);
    expect(crToXp("1/4")).toBe(50);
    expect(crToXp("1")).toBe(200);
    expect(crToXp("20")).toBe(25000);
    expect(crToXp("invalid")).toBe(0);
  });

  it("calculates party thresholds", () => {
    const thresholds = getThresholdsForParty([1, 1, 1, 1]);
    expect(thresholds.easy).toBe(100);
    expect(thresholds.medium).toBe(200);
    expect(thresholds.hard).toBe(300);
    expect(thresholds.deadly).toBe(400);
  });

  it("handles invalid party levels gracefully", () => {
    const thresholds = getThresholdsForParty([99]);
    expect(thresholds.easy).toBe(0);
  });

  it("applies encounter multipliers based on monster count", () => {
    expect(getEncounterMultiplier(1, 4)).toBe(1);
    expect(getEncounterMultiplier(2, 4)).toBe(1.5);
    expect(getEncounterMultiplier(7, 4)).toBe(2.5);
    expect(getEncounterMultiplier(15, 4)).toBe(4);
  });

  it("adjusts multiplier for small parties", () => {
    expect(getEncounterMultiplier(1, 2)).toBe(1.5);
  });

  it("adjusts multiplier for large parties", () => {
    expect(getEncounterMultiplier(2, 6)).toBe(1);
  });

  it("handles zero monsters", () => {
    expect(getEncounterMultiplier(0, 4)).toBe(1);
  });
});
