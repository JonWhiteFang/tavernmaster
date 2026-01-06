import { getDatabase } from "./db";
import { enqueueUpsertAndSchedule } from "../sync/ops";

export type LlmSettings = {
  baseUrl: string;
  model: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  stream: boolean;
};

export type AppSettings = {
  llm: LlmSettings;
};

const defaultSettings: AppSettings = {
  llm: {
    baseUrl: import.meta.env.VITE_LLM_BASE_URL ?? "http://localhost:11434",
    model: import.meta.env.VITE_LLM_MODEL ?? "llama3.1:8b",
    temperature: Number(import.meta.env.VITE_LLM_TEMPERATURE ?? 0.7),
    maxTokens: Number(import.meta.env.VITE_LLM_MAX_TOKENS ?? 800),
    topP: Number(import.meta.env.VITE_LLM_TOP_P ?? 1),
    stream: import.meta.env.VITE_LLM_STREAM !== "false"
  }
};

export async function getAppSettings(): Promise<AppSettings> {
  const db = await getDatabase();
  const rows = await db.select<{ value_json: string }[]>(
    "SELECT value_json FROM app_settings WHERE key = ?",
    ["app_settings"]
  );

  if (!rows.length) {
    await upsertAppSettings(defaultSettings);
    return defaultSettings;
  }

  try {
    return JSON.parse(rows[0].value_json) as AppSettings;
  } catch {
    return defaultSettings;
  }
}

export async function upsertAppSettings(settings: AppSettings): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.execute(
    `INSERT INTO app_settings (key, value_json, created_at, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at`,
    ["app_settings", JSON.stringify(settings), now, now]
  );

  await enqueueUpsertAndSchedule("app_settings", "app_settings", {
    key: "app_settings",
    value_json: JSON.stringify(settings),
    deleted_at: null,
    created_at: now,
    updated_at: now
  });
}

export async function ensureSettings(): Promise<AppSettings> {
  return getAppSettings();
}
