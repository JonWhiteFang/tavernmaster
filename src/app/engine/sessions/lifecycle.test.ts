import { beforeEach, describe, expect, it, vi } from "vitest";

const createSession = vi.fn();
const updateSession = vi.fn();
const loadCampaignState = vi.fn();
const saveCampaignState = vi.fn();
const listTurns = vi.fn();
const getCanonSummary = vi.fn();
const upsertCanonSummary = vi.fn();
const getDatabase = vi.fn();

vi.mock("../../data/sessions", () => ({
  createSession: (input: unknown) => createSession(input),
  updateSession: (id: string, input: unknown) => updateSession(id, input)
}));

vi.mock("../state/store", () => ({
  loadCampaignState: (id: string) => loadCampaignState(id),
  saveCampaignState: (id: string, doc: unknown) => saveCampaignState(id, doc)
}));

vi.mock("../turns/turnStore", () => ({
  listTurns: (id: string, limit: number) => listTurns(id, limit)
}));

vi.mock("../memory/canonStore", () => ({
  getCanonSummary: (id: string) => getCanonSummary(id),
  upsertCanonSummary: (id: string, summary: unknown) => upsertCanonSummary(id, summary)
}));

vi.mock("../../data/db", () => ({
  getDatabase: () => getDatabase()
}));

describe("session lifecycle", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  describe("buildRecap", () => {
    it("builds recap without LLM from local data", async () => {
      loadCampaignState.mockResolvedValue({
        version: 1,
        scene: "The tavern",
        quests: [{ name: "Find the artifact", status: "active" }]
      });
      getCanonSummary.mockResolvedValue({ longSummary: "A hero's journey" });
      listTurns.mockResolvedValue([{ aiOutput: "You enter the tavern..." }]);

      const { buildRecap } = await import("./lifecycle");
      const recap = await buildRecap("camp-1");

      expect(recap.campaignSummary).toBe("A hero's journey");
      expect(recap.currentScene).toBe("The tavern");
      expect(recap.activeQuests).toContain("Find the artifact");
    });

    it("provides defaults when no data exists", async () => {
      loadCampaignState.mockResolvedValue({ version: 1, scene: "", quests: [] });
      getCanonSummary.mockResolvedValue(null);
      listTurns.mockResolvedValue([]);

      const { buildRecap } = await import("./lifecycle");
      const recap = await buildRecap("camp-1");

      expect(recap.campaignSummary).toBe("A new adventure begins.");
      expect(recap.recentEvents).toBe("No recent events.");
    });
  });

  describe("startSession", () => {
    it("creates session and updates state", async () => {
      createSession.mockResolvedValue({ id: "sess-1" });
      loadCampaignState.mockResolvedValue({ version: 1 });
      saveCampaignState.mockResolvedValue(undefined);

      const { startSession } = await import("./lifecycle");
      const sessionId = await startSession("camp-1", "Session One");

      expect(sessionId).toBe("sess-1");
      expect(createSession).toHaveBeenCalledWith(
        expect.objectContaining({ campaignId: "camp-1", title: "Session One" })
      );
    });
  });

  describe("endSession", () => {
    it("marks session ended and updates canon summary", async () => {
      updateSession.mockResolvedValue(undefined);
      getCanonSummary.mockResolvedValue({ longSummary: "Old summary" });
      upsertCanonSummary.mockResolvedValue(undefined);
      loadCampaignState.mockResolvedValue({ version: 1 });
      saveCampaignState.mockResolvedValue(undefined);
      getDatabase.mockResolvedValue({ execute: vi.fn() });

      const { endSession } = await import("./lifecycle");
      await endSession("camp-1", "sess-1", "The party rested.");

      expect(updateSession).toHaveBeenCalledWith(
        "sess-1",
        expect.objectContaining({ recap: "The party rested." })
      );
      expect(upsertCanonSummary).toHaveBeenCalledWith(
        "camp-1",
        expect.objectContaining({ recent: "The party rested." })
      );
    });
  });
});
