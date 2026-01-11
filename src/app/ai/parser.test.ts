import { describe, expect, it } from "vitest";
import { extractJson, safeJsonParse } from "./parser";

describe("parser helpers", () => {
  describe("extractJson", () => {
    it("extracts JSON from code fences", () => {
      const content = '```json\n{"ok":true}\n```';
      expect(extractJson(content)).toBe('{"ok":true}');
    });

    it("extracts JSON from plain code fences", () => {
      const content = '```\n{"value":1}\n```';
      expect(extractJson(content)).toBe('{"value":1}');
    });

    it("extracts JSON from plain text", () => {
      const content = 'Result: {"value":42} done';
      expect(extractJson(content)).toBe('{"value":42}');
    });

    it("handles nested braces", () => {
      const content = '{"outer":{"inner":true}}';
      expect(extractJson(content)).toBe('{"outer":{"inner":true}}');
    });

    it("returns null when no JSON found", () => {
      expect(extractJson("no json here")).toBeNull();
      expect(extractJson("just { incomplete")).toBeNull();
    });

    it("handles text before and after JSON", () => {
      const content = 'Here is the result: {"data":"value"} and more text';
      expect(extractJson(content)).toBe('{"data":"value"}');
    });
  });

  describe("safeJsonParse", () => {
    it("parses valid JSON", () => {
      expect(safeJsonParse('{"ok":true}')).toEqual({ ok: true });
      expect(safeJsonParse("[1,2,3]")).toEqual([1, 2, 3]);
      expect(safeJsonParse('"string"')).toBe("string");
      expect(safeJsonParse("123")).toBe(123);
    });

    it("returns null for invalid JSON", () => {
      expect(safeJsonParse("not json")).toBeNull();
      expect(safeJsonParse("{invalid}")).toBeNull();
      expect(safeJsonParse("")).toBeNull();
    });
  });
});
