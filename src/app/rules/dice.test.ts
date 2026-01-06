import { describe, expect, it } from "vitest";
import { createSeededRng } from "./rng";
import { parseDiceExpression, rollD20WithAdvantage, rollDice } from "./dice";

describe("dice helpers", () => {
  it("parses dice expressions", () => {
    expect(parseDiceExpression("d20")).toEqual({ count: 1, sides: 20, modifier: 0 });
    expect(parseDiceExpression("2d6+3")).toEqual({ count: 2, sides: 6, modifier: 3 });
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
});
