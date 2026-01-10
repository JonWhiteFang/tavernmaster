import { describe, expect, it } from "vitest";
import {
  applyAncestryBonuses,
  calculateDerivedStats,
  getAbilityScoreCost,
  getAncestryByName,
  STANDARD_ARRAY,
  POINT_BUY_BUDGET,
  roll4d6DropLowest,
  rollAbilityScores,
  pointBuyCost,
  isValidPointBuy,
  abilityModifier,
  getPointBuyTotal
} from "./characterCreation";
import { createSeededRng } from "./rng";

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

describe("ability score generation", () => {
  it("has correct standard array values", () => {
    expect(STANDARD_ARRAY).toEqual([15, 14, 13, 12, 10, 8]);
    expect(STANDARD_ARRAY.length).toBe(6);
  });

  it("has correct point buy budget", () => {
    expect(POINT_BUY_BUDGET).toBe(27);
  });

  it("rolls 4d6 drop lowest deterministically with seeded rng", () => {
    const rng = createSeededRng(42);
    const result = roll4d6DropLowest(rng);

    // Result should be between 3 (all 1s) and 18 (all 6s)
    expect(result).toBeGreaterThanOrEqual(3);
    expect(result).toBeLessThanOrEqual(18);

    // Same seed should produce same result
    const rng2 = createSeededRng(42);
    expect(roll4d6DropLowest(rng2)).toBe(result);
  });

  it("rolls 6 ability scores", () => {
    const rng = createSeededRng(123);
    const scores = rollAbilityScores(rng);

    expect(scores).toHaveLength(6);
    scores.forEach((score) => {
      expect(score).toBeGreaterThanOrEqual(3);
      expect(score).toBeLessThanOrEqual(18);
    });
  });

  it("produces deterministic results with same seed", () => {
    const scores1 = rollAbilityScores(createSeededRng(999));
    const scores2 = rollAbilityScores(createSeededRng(999));

    expect(scores1).toEqual(scores2);
  });

  it("produces different results with different seeds", () => {
    const scores1 = rollAbilityScores(createSeededRng(1));
    const scores2 = rollAbilityScores(createSeededRng(2));

    expect(scores1).not.toEqual(scores2);
  });
});

describe("point buy validation", () => {
  it("pointBuyCost returns correct costs", () => {
    expect(pointBuyCost(8)).toBe(0);
    expect(pointBuyCost(10)).toBe(2);
    expect(pointBuyCost(13)).toBe(5);
    expect(pointBuyCost(15)).toBe(9);
  });

  it("validates point buy within budget", () => {
    // Standard array costs exactly 27 points
    const standardArrayScores = {
      str: 15,
      dex: 14,
      con: 13,
      int: 12,
      wis: 10,
      cha: 8
    };
    expect(getPointBuyTotal(standardArrayScores)).toBe(27);
    expect(isValidPointBuy(standardArrayScores)).toBe(true);
  });

  it("rejects point buy over budget", () => {
    const overBudget = {
      str: 15,
      dex: 15,
      con: 15,
      int: 10,
      wis: 8,
      cha: 8
    };
    expect(getPointBuyTotal(overBudget)).toBeGreaterThan(27);
    expect(isValidPointBuy(overBudget)).toBe(false);
  });

  it("rejects scores outside valid range", () => {
    const outOfRange = {
      str: 7, // Below 8
      dex: 10,
      con: 10,
      int: 10,
      wis: 10,
      cha: 10
    };
    expect(isValidPointBuy(outOfRange)).toBe(false);
  });
});

describe("ability modifier", () => {
  it("calculates correct modifiers", () => {
    expect(abilityModifier(1)).toBe(-5);
    expect(abilityModifier(8)).toBe(-1);
    expect(abilityModifier(10)).toBe(0);
    expect(abilityModifier(11)).toBe(0);
    expect(abilityModifier(12)).toBe(1);
    expect(abilityModifier(14)).toBe(2);
    expect(abilityModifier(18)).toBe(4);
    expect(abilityModifier(20)).toBe(5);
  });
});
