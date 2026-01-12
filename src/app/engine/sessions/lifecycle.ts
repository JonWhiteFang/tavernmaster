import { createSession, updateSession } from "../../data/sessions";
import { loadCampaignState, saveCampaignState } from "../state/store";
import { listTurns } from "../turns/turnStore";
import { getCanonSummary, upsertCanonSummary } from "../memory/canonStore";

export interface SessionRecap {
  campaignSummary: string;
  currentScene: string;
  activeQuests: string;
  recentEvents: string;
}

export async function buildRecap(campaignId: string): Promise<SessionRecap> {
  const [state, summary, turns] = await Promise.all([
    loadCampaignState(campaignId),
    getCanonSummary(campaignId),
    listTurns(campaignId, 5)
  ]);

  const activeQuests = (state?.quests ?? [])
    .filter((q) => q.status === "active")
    .map((q) => q.name)
    .join(", ");

  const recentEvents = turns
    .map((t) => t.aiOutput)
    .filter(Boolean)
    .join(" ")
    .slice(0, 500);

  return {
    campaignSummary: summary?.longSummary || "A new adventure begins.",
    currentScene: state?.scene || "",
    activeQuests: activeQuests || "None",
    recentEvents: recentEvents || "No recent events."
  };
}

export async function startSession(campaignId: string, title: string): Promise<string> {
  const session = await createSession({ campaignId, title, startedAt: new Date().toISOString() });
  const state = await loadCampaignState(campaignId);
  if (state) {
    await saveCampaignState(campaignId, {
      ...state,
      flags: { ...state.flags, activeSessionId: session.id }
    });
  }
  return session.id;
}

export async function endSession(
  campaignId: string,
  sessionId: string,
  recap: string
): Promise<void> {
  const now = new Date().toISOString();
  await updateSession(sessionId, { endedAt: now, recap });

  const existing = await getCanonSummary(campaignId);
  await upsertCanonSummary(campaignId, { longSummary: existing?.longSummary || "", recent: recap });

  const state = await loadCampaignState(campaignId);
  if (state?.flags?.activeSessionId === sessionId) {
    const { activeSessionId: _removed, ...rest } = state.flags;
    void _removed;
    await saveCampaignState(campaignId, { ...state, flags: rest });
  }
}

export function getSessionRecapText(recap: SessionRecap): string {
  return `Campaign: ${recap.campaignSummary}\nScene: ${recap.currentScene}\nQuests: ${recap.activeQuests}\nRecent: ${recap.recentEvents}`;
}
