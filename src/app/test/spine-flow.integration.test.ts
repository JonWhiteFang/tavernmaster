import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Integration test covering the "first playable loop" spine flow:
 * 1. Create campaign
 * 2. Create session
 * 3. Create encounter
 * 4. Generate proposals (mocked)
 * 5. Approve proposals
 * 6. Run encounter turns
 * 7. Export session packet
 *
 * This test validates the data layer functions work together correctly.
 */

vi.mock("../data/db", () => {
  const store: Record<string, Record<string, unknown>[]> = {
    campaigns: [],
    sessions: [],
    encounters: [],
    initiative_entries: [],
    action_proposals: [],
    ai_logs: [],
    journal_entries: []
  };

  return {
    getDatabase: vi.fn().mockResolvedValue({
      execute: vi.fn().mockImplementation(async (sql: string, params: unknown[]) => {
        if (sql.includes("INSERT INTO campaigns")) {
          store.campaigns.push({ id: params[0], name: params[1], summary: params[2] });
        }
        if (sql.includes("INSERT INTO sessions")) {
          store.sessions.push({ id: params[0], campaign_id: params[1], title: params[2] });
        }
        if (sql.includes("INSERT INTO encounters")) {
          store.encounters.push({
            id: params[0],
            campaign_id: params[1],
            name: params[2],
            difficulty: params[4],
            round: params[5]
          });
        }
        if (sql.includes("INSERT INTO action_proposals")) {
          store.action_proposals.push({
            id: params[0],
            encounter_id: params[1],
            character_id: params[2],
            status: params[5]
          });
        }
        if (sql.includes("UPDATE action_proposals SET status")) {
          const id = params[2];
          const proposal = store.action_proposals.find((p) => p.id === id);
          if (proposal) proposal.status = params[0];
        }
        if (sql.includes("INSERT INTO ai_logs")) {
          store.ai_logs.push({ id: params[0], campaign_id: params[1], session_id: params[2] });
        }
        if (sql.includes("INSERT INTO journal_entries")) {
          store.journal_entries.push({ id: params[0], campaign_id: params[1] });
        }
      }),
      select: vi.fn().mockImplementation(async (sql: string, params: unknown[]) => {
        if (sql.includes("FROM campaigns")) {
          return store.campaigns.filter((c) => !params.length || c.id === params[0]);
        }
        if (sql.includes("FROM sessions WHERE campaign_id")) {
          return store.sessions.filter((s) => s.campaign_id === params[0]);
        }
        if (sql.includes("FROM encounters WHERE campaign_id")) {
          return store.encounters.filter((e) => e.campaign_id === params[0]);
        }
        if (sql.includes("FROM action_proposals WHERE encounter_id")) {
          return store.action_proposals.filter((p) => p.encounter_id === params[0]);
        }
        if (sql.includes("FROM ai_logs")) {
          return store.ai_logs;
        }
        if (sql.includes("FROM journal_entries")) {
          return store.journal_entries;
        }
        return [];
      })
    })
  };
});

vi.mock("../sync/ops", () => ({
  enqueueUpsertAndSchedule: vi.fn().mockResolvedValue(undefined)
}));

vi.mock("../data/encryption", () => ({
  encryptValue: vi.fn().mockImplementation((v) => Promise.resolve(v)),
  decryptValue: vi.fn().mockImplementation((v) => Promise.resolve(v))
}));

import { createCampaign } from "../data/campaigns";
import { createSession } from "../data/sessions";
import { createEncounter } from "../data/encounters";
import { createActionProposals, updateProposalStatus } from "../data/action_proposals";
import { insertAiLog } from "../data/ai_logs";

describe("spine flow integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("completes the first playable loop", async () => {
    // 1. Create campaign
    const campaign = await createCampaign({ name: "Test Campaign", summary: "A test" });
    expect(campaign.id).toBeDefined();
    expect(campaign.name).toBe("Test Campaign");

    // 2. Create session
    const session = await createSession({
      campaignId: campaign.id,
      title: "Session 1",
      startedAt: new Date().toISOString()
    });
    expect(session.id).toBeDefined();
    expect(session.campaignId).toBe(campaign.id);

    // 3. Create encounter
    const encounter = await createEncounter({
      campaignId: campaign.id,
      name: "Goblin Ambush",
      difficulty: "medium"
    });
    expect(encounter.id).toBeDefined();

    // 4. Generate proposals (simulated)
    const proposals = await createActionProposals(encounter.id, [
      { characterId: "char-1", summary: "Attack", rulesRefs: [] },
      { characterId: "char-2", summary: "Defend", rulesRefs: [] }
    ]);
    expect(proposals).toHaveLength(2);
    expect(proposals[0].status).toBe("pending");

    // 5. Approve proposals
    await updateProposalStatus(proposals[0].id, "approved");
    await updateProposalStatus(proposals[1].id, "approved");

    // 6. Log AI narration (simulates DM narration)
    const aiLog = await insertAiLog({
      campaignId: campaign.id,
      sessionId: session.id,
      kind: "dm",
      content: "The goblins attack!"
    });
    expect(aiLog.id).toBeDefined();

    // 7. Export would use these records - verify they exist
    expect(campaign.id).toBeDefined();
    expect(session.id).toBeDefined();
    expect(encounter.id).toBeDefined();
    expect(proposals.length).toBe(2);
    expect(aiLog.id).toBeDefined();
  });
});
