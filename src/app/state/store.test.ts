import { describe, expect, it } from "vitest";
import { initialState } from "./store";

describe("initialState", () => {
  it("starts with empty collections", () => {
    expect(initialState.characters).toEqual([]);
    expect(initialState.journal).toEqual([]);
  });
});
