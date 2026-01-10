import { getDatabase } from "./db";

export type UiState = {
  activeCampaignId: string | null;
  activeSessionId: string | null;
  activeEncounterId: string | null;
};

const defaultUiState: UiState = {
  activeCampaignId: null,
  activeSessionId: null,
  activeEncounterId: null
};

export async function getUiState(): Promise<UiState> {
  try {
    const db = await getDatabase();
    const rows = await db.select<{ value_json: string }[]>(
      "SELECT value_json FROM app_settings WHERE key = ?",
      ["ui_state"]
    );
    if (!rows.length) {
      return defaultUiState;
    }
    return { ...defaultUiState, ...(JSON.parse(rows[0].value_json) as Partial<UiState>) };
  } catch {
    return defaultUiState;
  }
}

export async function setUiState(state: UiState): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.execute(
    `INSERT INTO app_settings (key, value_json, created_at, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at`,
    ["ui_state", JSON.stringify(state), now, now]
  );
  // Note: ui_state is NOT enqueued for sync (local-only per syncFilter in tables.ts)
}

export async function migrateLocalStorageToUiState(): Promise<UiState | null> {
  if (typeof window === "undefined") {
    return null;
  }
  const campaignKey = "tm.activeCampaignId";
  const sessionKey = "tm.activeSessionId";
  const hasSelectedCampaignKey = "tm.hasSelectedCampaign";
  const hasSelectedSessionKey = "tm.hasSelectedSession";

  const stored = window.localStorage.getItem(campaignKey);
  if (stored === null) {
    return null;
  }

  try {
    const hasSelectedCampaign = JSON.parse(
      window.localStorage.getItem(hasSelectedCampaignKey) ?? "false"
    ) as boolean;
    const hasSelectedSession = JSON.parse(
      window.localStorage.getItem(hasSelectedSessionKey) ?? "false"
    ) as boolean;

    const state: UiState = {
      activeCampaignId: hasSelectedCampaign ? (JSON.parse(stored) as string | null) : null,
      activeSessionId: hasSelectedSession
        ? (JSON.parse(window.localStorage.getItem(sessionKey) ?? "null") as string | null)
        : null,
      activeEncounterId: null
    };

    // Clear legacy keys
    window.localStorage.removeItem(campaignKey);
    window.localStorage.removeItem(sessionKey);
    window.localStorage.removeItem(hasSelectedCampaignKey);
    window.localStorage.removeItem(hasSelectedSessionKey);

    return state;
  } catch {
    return null;
  }
}
