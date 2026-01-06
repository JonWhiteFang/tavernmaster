import type { ChatMessage, LlmConfig, LlmResponse } from "./types";

function sanitizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/$/, "");
}

type ChatCompletionChunk = {
  choices: Array<{
    delta?: { content?: string };
    message?: { content?: string };
    finish_reason?: string | null;
  }>;
};

type ChatCompletionResponse = {
  choices: Array<{ message: { content: string } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
};

export async function requestChatCompletion(
  config: LlmConfig,
  messages: ChatMessage[]
): Promise<LlmResponse> {
  const baseUrl = sanitizeBaseUrl(config.baseUrl);
  const response = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: config.temperature,
      max_tokens: config.maxTokens,
      top_p: config.topP,
      stream: false
    })
  });

  if (!response.ok) {
    throw new Error(`LLM request failed: ${response.status}`);
  }

  const data = (await response.json()) as ChatCompletionResponse;
  const content = data.choices?.[0]?.message?.content ?? "";

  return {
    content,
    usage: {
      promptTokens: data.usage?.prompt_tokens,
      completionTokens: data.usage?.completion_tokens,
      totalTokens: data.usage?.total_tokens
    }
  };
}

export async function* streamChatCompletion(
  config: LlmConfig,
  messages: ChatMessage[]
): AsyncGenerator<string, LlmResponse, void> {
  const baseUrl = sanitizeBaseUrl(config.baseUrl);
  const response = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: config.temperature,
      max_tokens: config.maxTokens,
      top_p: config.topP,
      stream: true
    })
  });

  if (!response.ok || !response.body) {
    throw new Error(`LLM streaming request failed: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }
    buffer += decoder.decode(value, { stream: true });

    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";

    for (const part of parts) {
      const lines = part.split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) {
          continue;
        }
        const payload = trimmed.replace("data:", "").trim();
        if (payload === "[DONE]") {
          return { content };
        }
        let chunk: ChatCompletionChunk | null = null;
        try {
          chunk = JSON.parse(payload) as ChatCompletionChunk;
        } catch {
          chunk = null;
        }
        const delta = chunk?.choices?.[0]?.delta?.content ?? "";
        if (delta) {
          content += delta;
          yield delta;
        }
      }
    }
  }

  return { content };
}
