import { describe, expect, it } from "vitest";
import { createSeededRng } from "./rng";
import {
  normalizeAdvantage,
  parseOrReturnDice,
  parseDiceExpression,
  rollD20WithAdvantage,
  rollDice
} from "./dice";

describe("dice helpers", () => {
  it("parses dice expressions", () => {
    expect(parseDiceExpression("d20")).toEqual({ count: 1, sides: 20, modifier: 0 });
    expect(parseDiceExpression("2d6+3")).toEqual({ count: 2, sides: 6, modifier: 3 });
    expect(parseDiceExpression("1d8-2")).toEqual({ count: 1, sides: 8, modifier: -2 });
  });

  it("throws on invalid dice expressions", () => {
    expect(() => parseDiceExpression("invalid")).toThrow("Invalid dice expression");
    expect(() => parseDiceExpression("0d6")).toThrow("Dice count must be >= 1");
    expect(() => parseDiceExpression("1d1")).toThrow("Dice sides must be >= 2");
  });

  it("rolls deterministically with a seeded RNG", () => {
    const rngA = createSeededRng(42);
    const rngB = createSeededRng(42);

    const first = rollDice({ count: 2, sides: 6, modifier: 1 }, rngA);
    const second = rollDice({ count: 2, sides: 6, modifier: 1 }, rngB);

    expect(first.total).toBe(second.total);
    expect(first.rolls).toEqual(second.rolls);
  });

  it("handles advantage and disadvantage", () => {
    const rng = createSeededRng(7);
    const advantageRoll = rollD20WithAdvantage(rng, "advantage");
    const disadvantageRoll = rollD20WithAdvantage(rng, "disadvantage");

    expect(advantageRoll.chosen).toBe(Math.max(...advantageRoll.rolls));
    expect(disadvantageRoll.chosen).toBe(Math.min(...disadvantageRoll.rolls));
  });

  it("handles normal rolls (single die)", () => {
    const rng = createSeededRng(42);
    const normalRoll = rollD20WithAdvantage(rng, "normal");
    expect(normalRoll.rolls).toHaveLength(1);
    expect(normalRoll.chosen).toBe(normalRoll.rolls[0]);
  });

  it("normalizes advantage states", () => {
    expect(normalizeAdvantage(["advantage", "disadvantage"])).toBe("normal");
    expect(normalizeAdvantage(["advantage"])).toBe("advantage");
    expect(normalizeAdvantage(["disadvantage"])).toBe("disadvantage");
    expect(normalizeAdvantage([])).toBe("normal");
  });

  it("parseOrReturnDice handles both string and object", () => {
    const fromString = parseOrReturnDice("2d6+1");
    expect(fromString).toEqual({ count: 2, sides: 6, modifier: 1 });

    const obj = { count: 1, sides: 8, modifier: 0 };
    expect(parseOrReturnDice(obj)).toBe(obj);
  });
});
