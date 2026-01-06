import { describe, expect, it } from "vitest";
import { extractJson, safeJsonParse } from "./parser";

describe("parser helpers", () => {
  it("extracts JSON from code fences", () => {
    const content = '```json\n{"ok":true}\n```';
    expect(extractJson(content)).toBe('{"ok":true}');
  });

  it("extracts JSON from plain text", () => {
    const content = 'Result: {"value":42} done';
    expect(extractJson(content)).toBe('{"value":42}');
  });

  it("parses JSON safely", () => {
    expect(safeJsonParse('{"ok":true}')).toEqual({ ok: true });
    expect(safeJsonParse("not json")).toBeNull();
  });
});
