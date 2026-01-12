import { describe, expect, it, vi } from "vitest";
import { parseTurnResponse, parseWithRetry } from "./parse";

describe("parse", () => {
  describe("parseTurnResponse", () => {
    it("parses valid TurnResponse JSON", () => {
      const valid = JSON.stringify({
        narrative: "You enter the tavern.",
        choices: [{ id: "1", text: "Approach the bar" }]
      });

      const result = parseTurnResponse(valid);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.narrative).toBe("You enter the tavern.");
        expect(result.data.choices).toHaveLength(1);
      }
    });

    it("extracts JSON from surrounding text", () => {
      const wrapped = `Here is the response: {"narrative": "Hello", "choices": [{"id": "1", "text": "Go"}]} End.`;

      const result = parseTurnResponse(wrapped);

      expect(result.success).toBe(true);
    });

    it("fails on missing required fields", () => {
      const invalid = JSON.stringify({ narrative: "Hello" });

      const result = parseTurnResponse(invalid);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("choices");
      }
    });

    it("fails on invalid JSON syntax", () => {
      const result = parseTurnResponse("{invalid json}");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid JSON syntax");
      }
    });

    it("fails when no JSON found", () => {
      const result = parseTurnResponse("Just plain text");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("No JSON object found");
      }
    });

    it("validates choice count bounds", () => {
      const tooMany = JSON.stringify({
        narrative: "Test",
        choices: Array.from({ length: 10 }, (_, i) => ({ id: String(i), text: `Choice ${i}` }))
      });

      const result = parseTurnResponse(tooMany);

      expect(result.success).toBe(false);
    });
  });

  describe("parseWithRetry", () => {
    it("succeeds on first attempt", async () => {
      const fetch = vi.fn().mockResolvedValue(
        JSON.stringify({
          narrative: "Success",
          choices: [{ id: "1", text: "Go" }]
        })
      );

      const result = await parseWithRetry(fetch);

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(1);
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it("retries on failure and succeeds", async () => {
      const fetch = vi
        .fn()
        .mockResolvedValueOnce("invalid")
        .mockResolvedValueOnce(
          JSON.stringify({ narrative: "Ok", choices: [{ id: "1", text: "Go" }] })
        );

      const onRetry = vi.fn();
      const result = await parseWithRetry(fetch, { maxAttempts: 2, onRetry });

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(2);
      expect(onRetry).toHaveBeenCalledWith(2);
    });

    it("fails after all attempts exhausted", async () => {
      const fetch = vi.fn().mockResolvedValue("invalid");

      const result = await parseWithRetry(fetch, { maxAttempts: 2 });

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(2);
      expect(result.rawOutputs).toHaveLength(2);
    });
  });
});
