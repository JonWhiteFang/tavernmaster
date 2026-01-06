import { getDatabase } from "./db";
import { enqueueUpsertAndSchedule } from "../sync/ops";
import { getSecret, setSecret } from "../sync/secure";

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

const LLM_SETTINGS_SECRET_KEY = "llm_settings";
const KEYCHAIN_TIMEOUT_MS = 1000;
let keychainEnabled = true;

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timeoutId: number | null = null;
  const timeoutPromise = new Promise<T>((_resolve, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error("timeout")), ms);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
    }
  }
}

async function readLlmSettingsFromKeychain(): Promise<LlmSettings | null> {
  if (!keychainEnabled) {
    return null;
  }
  try {
    const raw = await withTimeout(getSecret(LLM_SETTINGS_SECRET_KEY), KEYCHAIN_TIMEOUT_MS);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as LlmSettings;
  } catch {
    keychainEnabled = false;
    return null;
  }
}

async function writeLlmSettingsToKeychain(settings: LlmSettings): Promise<void> {
  if (!keychainEnabled) {
    return;
  }
  try {
    await withTimeout(
      setSecret(LLM_SETTINGS_SECRET_KEY, JSON.stringify(settings)),
      KEYCHAIN_TIMEOUT_MS
    );
  } catch {
    keychainEnabled = false;
    // Keychain might not be available in a browser dev session; settings still persist in SQLite.
  }
}

export async function getAppSettings(): Promise<AppSettings> {
  try {
    const keychain = await readLlmSettingsFromKeychain();
    if (keychain) {
      return { llm: keychain };
    }

    const db = await getDatabase();
    const rows = await db.select<{ value_json: string }[]>(
      "SELECT value_json FROM app_settings WHERE key = ?",
      ["app_settings"]
    );

    if (!rows.length) {
      await upsertAppSettings(defaultSettings);
      return defaultSettings;
    }

    const parsed = JSON.parse(rows[0].value_json) as AppSettings;
    await writeLlmSettingsToKeychain(parsed.llm);
    return parsed;
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

  await writeLlmSettingsToKeychain(settings.llm);

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
