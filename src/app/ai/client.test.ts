import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { requestChatCompletion, streamChatCompletion } from "./client";
import type { ChatMessage, LlmConfig } from "./types";

describe("LLM client", () => {
  const config: LlmConfig = {
    baseUrl: "http://localhost:11434/",
    model: "llama3",
    temperature: 0.7,
    maxTokens: 120,
    topP: 1,
    stream: false
  };
  const messages: ChatMessage[] = [{ role: "user", content: "hello" }];

  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it("requests chat completions with a sanitized base url", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        choices: [{ message: { content: "Hi there" } }],
        usage: { prompt_tokens: 1, completion_tokens: 2, total_tokens: 3 }
      })
    });

    const response = await requestChatCompletion(config, messages);

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:11434/v1/chat/completions",
      expect.objectContaining({
        method: "POST"
      })
    );
    const body = JSON.parse(fetchMock.mock.calls[0][1]?.body as string);
    expect(body).toMatchObject({
      model: "llama3",
      stream: false,
      temperature: 0.7,
      max_tokens: 120,
      top_p: 1
    });
    expect(response).toEqual({
      content: "Hi there",
      usage: {
        promptTokens: 1,
        completionTokens: 2,
        totalTokens: 3
      }
    });
  });

  it("throws when the response is not ok", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500 });

    await expect(requestChatCompletion(config, messages)).rejects.toThrow(
      "LLM request failed: 500"
    );
  });

  it("streams chat completions", async () => {
    const encoder = new globalThis.TextEncoder();
    const chunks = [
      'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":" world"}}]}\n\n',
      "data: [DONE]\n\n"
    ];

    let index = 0;
    const reader = {
      read: vi.fn().mockImplementation(async () => {
        if (index >= chunks.length) {
          return { done: true, value: undefined };
        }
        const value = encoder.encode(chunks[index]);
        index += 1;
        return { done: false, value };
      })
    };

    fetchMock.mockResolvedValue({
      ok: true,
      body: {
        getReader: () => reader
      }
    });

    const output: string[] = [];
    for await (const chunk of streamChatCompletion(config, messages)) {
      output.push(chunk);
    }

    expect(output.join("")).toBe("Hello world");
  });

  it("throws when streaming response is invalid", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 401, body: null });

    await expect(async () => {
      const iterator = streamChatCompletion(config, messages);
      await iterator.next();
    }).rejects.toThrow("LLM streaming request failed: 401");
  });
});
