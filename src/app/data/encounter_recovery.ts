import type { RulesState } from "../rules/types";
import { getDatabase } from "./db";

export type EncounterRecoverySnapshot = {
  version: 1;
  savedAt: string;
  rulesState: RulesState;
  log: string[];
  rngSeed: number;
};

const RECOVERY_KEY = "encounter_recovery";

function isRecoverySnapshot(value: unknown): value is EncounterRecoverySnapshot {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    record.version === 1 &&
    typeof record.savedAt === "string" &&
    typeof record.rngSeed === "number" &&
    Array.isArray(record.log) &&
    typeof record.rulesState === "object" &&
    record.rulesState !== null
  );
}

export async function loadEncounterRecovery(): Promise<EncounterRecoverySnapshot | null> {
  const db = await getDatabase();
  const rows = await db.select<{ value_json: string }[]>(
    "SELECT value_json FROM app_settings WHERE key = ?",
    [RECOVERY_KEY]
  );

  if (!rows.length) {
    return null;
  }

  try {
    const parsed = JSON.parse(rows[0].value_json) as unknown;
    return isRecoverySnapshot(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function saveEncounterRecovery(
  snapshot: Omit<EncounterRecoverySnapshot, "version" | "savedAt">
): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const payload: EncounterRecoverySnapshot = {
    ...snapshot,
    version: 1,
    savedAt: now
  };

  await db.execute(
    `INSERT INTO app_settings (key, value_json, created_at, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at`,
    [RECOVERY_KEY, JSON.stringify(payload), now, now]
  );
}

export async function clearEncounterRecovery(): Promise<void> {
  const db = await getDatabase();
  await db.execute("DELETE FROM app_settings WHERE key = ?", [RECOVERY_KEY]);
}
