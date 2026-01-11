import { describe, expect, it } from "vitest";
import { initialState } from "./store";

describe("initialState", () => {
  it("starts with empty collections", () => {
    expect(initialState.characters).toEqual([]);
    expect(initialState.journal).toEqual([]);
  });

  it("has undefined campaign and encounter", () => {
    expect(initialState.campaign).toBeUndefined();
    expect(initialState.encounter).toBeUndefined();
  });

  it("is a stable reference", () => {
    expect(initialState).toBe(initialState);
  });
});
