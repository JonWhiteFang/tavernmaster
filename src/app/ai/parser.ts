import type { ChatMessage, LlmConfig } from "./types";
import { requestChatCompletion } from "./client";

const jsonBlockRegex = /```(?:json)?\s*([\s\S]*?)```/i;

export function extractJson(text: string): string | null {
  const match = jsonBlockRegex.exec(text);
  if (match?.[1]) {
    return match[1].trim();
  }

  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first >= 0 && last > first) {
    return text.slice(first, last + 1);
  }

  return null;
}

export function safeJsonParse<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export async function parseJsonWithRepair<T>(
  config: LlmConfig,
  raw: string,
  attemptLimit = 1
): Promise<T | null> {
  const direct = safeJsonParse<T>(raw) ?? safeJsonParse<T>(extractJson(raw) ?? "");
  if (direct) {
    return direct;
  }

  if (attemptLimit <= 0) {
    return null;
  }

  const repairPrompt: ChatMessage[] = [
    {
      role: "system",
      content:
        "You are a strict JSON formatter. Return only valid JSON with no commentary or code fences."
    },
    {
      role: "user",
      content: raw
    }
  ];

  const response = await requestChatCompletion(
    {
      ...config,
      temperature: 0,
      maxTokens: Math.min(config.maxTokens, 400)
    },
    repairPrompt
  );

  return (
    safeJsonParse<T>(response.content) ?? safeJsonParse<T>(extractJson(response.content) ?? "")
  );
}
