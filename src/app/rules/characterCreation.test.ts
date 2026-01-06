import { describe, expect, it } from "vitest";
import {
  applyAncestryBonuses,
  calculateDerivedStats,
  getAbilityScoreCost,
  getAncestryByName
} from "./characterCreation";

const baseScores = {
  str: 8,
  dex: 10,
  con: 10,
  int: 12,
  wis: 13,
  cha: 14
} as const;

describe("character creation helpers", () => {
  it("calculates point-buy costs for scores", () => {
    expect(getAbilityScoreCost(8)).toBe(0);
    expect(getAbilityScoreCost(14)).toBe(7);
    expect(getAbilityScoreCost(15)).toBe(9);
  });

  it("applies ancestry bonuses including flexible choices", () => {
    const ancestry = getAncestryByName("Half-Elf");
    const result = applyAncestryBonuses(baseScores, ancestry, ["str", "wis"]);

    expect(result.cha).toBe(16);
    expect(result.str).toBe(9);
    expect(result.wis).toBe(14);
  });

  it("calculates derived stats from class, level, and ancestry", () => {
    const stats = calculateDerivedStats({
      abilities: { str: 10, dex: 14, con: 12, int: 10, wis: 10, cha: 10 },
      level: 3,
      className: "Fighter",
      ancestryName: "Human"
    });

    expect(stats.hitPointMax).toBe(25);
    expect(stats.armorClass).toBe(12);
    expect(stats.initiativeBonus).toBe(2);
    expect(stats.speed).toBe(30);
  });
});
