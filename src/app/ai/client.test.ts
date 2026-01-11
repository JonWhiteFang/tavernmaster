import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { requestChatCompletion, streamChatCompletion } from "./client";
import type { LlmConfig, ChatMessage } from "./types";

const mockConfig: LlmConfig = {
  baseUrl: "http://localhost:11434/",
  model: "llama3.1:8b",
  temperature: 0.7,
  maxTokens: 2048,
  topP: 0.9,
  stream: false
};

const mockMessages: ChatMessage[] = [
  { role: "system", content: "You are a helpful assistant." },
  { role: "user", content: "Hello" }
];

function mockResponse(data: {
  ok?: boolean;
  status?: number;
  body?: ReadableStream<Uint8Array> | null;
  json?: () => Promise<unknown>;
}): globalThis.Response {
  return data as globalThis.Response;
}

describe("AI client", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("requestChatCompletion", () => {
    it("sends correct request format", async () => {
      const mockResponse2 = {
        choices: [{ message: { content: "Hello there!" } }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
      };

      vi.mocked(fetch).mockResolvedValueOnce(
        mockResponse({
          ok: true,
          json: () => Promise.resolve(mockResponse2)
        })
      );

      const result = await requestChatCompletion(mockConfig, mockMessages);

      expect(fetch).toHaveBeenCalledWith("http://localhost:11434/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: expect.stringContaining('"model":"llama3.1:8b"')
      });

      expect(result.content).toBe("Hello there!");
      expect(result.usage?.totalTokens).toBe(15);
    });

    it("strips trailing slash from base URL", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        mockResponse({
          ok: true,
          json: () => Promise.resolve({ choices: [{ message: { content: "" } }] })
        })
      );

      await requestChatCompletion({ ...mockConfig, baseUrl: "http://example.com/" }, mockMessages);

      expect(fetch).toHaveBeenCalledWith(
        "http://example.com/v1/chat/completions",
        expect.any(Object)
      );
    });

    it("throws on non-ok response", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        mockResponse({
          ok: false,
          status: 500
        })
      );

      await expect(requestChatCompletion(mockConfig, mockMessages)).rejects.toThrow(
        "LLM request failed: 500"
      );
    });

    it("handles missing content gracefully", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        mockResponse({
          ok: true,
          json: () => Promise.resolve({ choices: [] })
        })
      );

      const result = await requestChatCompletion(mockConfig, mockMessages);
      expect(result.content).toBe("");
    });
  });

  describe("streamChatCompletion", () => {
    it("throws on non-ok response", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        mockResponse({
          ok: false,
          status: 503
        })
      );

      const generator = streamChatCompletion(mockConfig, mockMessages);
      await expect(generator.next()).rejects.toThrow("LLM streaming request failed: 503");
    });

    it("throws when body is null", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        mockResponse({
          ok: true,
          body: null
        })
      );

      const generator = streamChatCompletion(mockConfig, mockMessages);
      await expect(generator.next()).rejects.toThrow("LLM streaming request failed");
    });
  });
});
