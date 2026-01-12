import { TurnResponseSchema, type TurnResponse } from "./schemas";

export interface ParseResult {
  success: true;
  data: TurnResponse;
}

export interface ParseError {
  success: false;
  error: string;
  raw: string;
}

export type ParseOutcome = ParseResult | ParseError;

function extractJson(text: string): string | null {
  // Try to find first JSON object in text
  const start = text.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

export function parseTurnResponse(raw: string): ParseOutcome {
  const jsonStr = raw.trim().startsWith("{") ? raw.trim() : extractJson(raw);

  if (!jsonStr) {
    return { success: false, error: "No JSON object found", raw };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    return { success: false, error: "Invalid JSON syntax", raw };
  }

  const result = TurnResponseSchema.safeParse(parsed);
  if (!result.success) {
    return { success: false, error: result.error.message, raw };
  }

  return { success: true, data: result.data };
}

export interface RetryConfig {
  maxAttempts: number;
  onRetry?: (attempt: number) => void;
}

export async function parseWithRetry(
  fetchResponse: (attempt: number) => Promise<string>,
  config: RetryConfig = { maxAttempts: 2 }
): Promise<ParseOutcome & { attempts: number; rawOutputs: string[] }> {
  const rawOutputs: string[] = [];

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    if (attempt > 1) config.onRetry?.(attempt);

    const raw = await fetchResponse(attempt);
    rawOutputs.push(raw);

    const result = parseTurnResponse(raw);
    if (result.success) {
      return { ...result, attempts: attempt, rawOutputs };
    }
  }

  return {
    success: false,
    error: "All retry attempts failed",
    raw: rawOutputs[rawOutputs.length - 1],
    attempts: config.maxAttempts,
    rawOutputs
  };
}
