import { describe, expect, it } from "vitest";
import { parseDiceExpression } from "./dice";

describe("parseDiceExpression", () => {
  it("parses default count", () => {
    expect(parseDiceExpression("d20")).toEqual({ count: 1, sides: 20, modifier: 0 });
  });

  it("parses positive modifiers", () => {
    expect(parseDiceExpression("2d6+3")).toEqual({ count: 2, sides: 6, modifier: 3 });
  });

  it("parses negative modifiers", () => {
    expect(parseDiceExpression("3d8-2")).toEqual({ count: 3, sides: 8, modifier: -2 });
  });

  it("rejects invalid expressions", () => {
    expect(() => parseDiceExpression("2d")).toThrow();
    expect(() => parseDiceExpression("d1")).toThrow();
  });
});
