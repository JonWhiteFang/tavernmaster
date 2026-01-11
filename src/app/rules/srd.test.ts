import { describe, expect, it } from "vitest";
import { emptySrdIndex } from "./srd";

describe("srd", () => {
  it("exports an empty SRD index placeholder", () => {
    expect(emptySrdIndex.spells).toEqual([]);
    expect(emptySrdIndex.items).toEqual([]);
    expect(emptySrdIndex.monsters).toEqual([]);
    expect(emptySrdIndex.conditions).toEqual([]);
  });
});
