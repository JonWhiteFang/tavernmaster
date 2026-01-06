import { describe, expect, it } from "vitest";
import { createSeededRng } from "./rng";

describe("rng", () => {
  it("produces deterministic sequences per seed", () => {
    const a = createSeededRng(123);
    const b = createSeededRng(123);

    const valuesA = [a(), a(), a()];
    const valuesB = [b(), b(), b()];
    expect(valuesA).toEqual(valuesB);
  });

  it("produces values in [0, 1)", () => {
    const rng = createSeededRng(1);
    for (let i = 0; i < 50; i += 1) {
      const value = rng();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});
