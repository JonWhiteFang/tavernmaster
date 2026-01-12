import { beforeEach, describe, expect, it, vi } from "vitest";
import { CampaignStateDocSchema, createDefaultStateDoc } from "./types";

const execute = vi.fn();
const select = vi.fn();

vi.mock("../../data/db", () => ({
  getDatabase: vi.fn(async () => ({ execute, select })),
  withTransaction: vi.fn(async (fn) => fn({ execute, select }))
}));

describe("CampaignStateDoc", () => {
  it("creates default doc with all required fields", () => {
    const doc = createDefaultStateDoc();

    expect(doc.version).toBe(1);
    expect(doc.scene).toBe("");
    expect(doc.mode).toBe("exploration");
    expect(doc.quests).toEqual([]);
    expect(doc.npcs).toEqual([]);
    expect(doc.locations).toEqual([]);
    expect(doc.turnCount).toBe(0);
  });

  it("validates and parses partial input", () => {
    const partial = { scene: "A dark tavern", mode: "dialogue" as const };
    const doc = CampaignStateDocSchema.parse(partial);

    expect(doc.scene).toBe("A dark tavern");
    expect(doc.mode).toBe("dialogue");
    expect(doc.version).toBe(1);
  });

  it("rejects invalid mode", () => {
    expect(() => CampaignStateDocSchema.parse({ mode: "invalid" })).toThrow();
  });
});

describe("state store", () => {
  beforeEach(() => {
    vi.resetModules();
    execute.mockClear();
    select.mockClear();
  });

  it("loadCampaignState returns default when no row exists", async () => {
    select.mockResolvedValue([]);
    execute.mockResolvedValue(undefined);

    const { loadCampaignState } = await import("./store");
    const doc = await loadCampaignState("camp-1");

    expect(doc.version).toBe(1);
    expect(doc.mode).toBe("exploration");
    expect(execute).toHaveBeenCalled(); // saves default
  });

  it("loadCampaignState parses existing state_json", async () => {
    const stored = { version: 1, scene: "Forest", mode: "exploration" };
    select.mockResolvedValue([{ state_json: JSON.stringify(stored) }]);

    const { loadCampaignState } = await import("./store");
    const doc = await loadCampaignState("camp-1");

    expect(doc.scene).toBe("Forest");
  });

  it("saveCampaignState upserts with updated_at", async () => {
    const { saveCampaignState } = await import("./store");
    const doc = createDefaultStateDoc();
    doc.scene = "Castle";

    await saveCampaignState("camp-1", doc);

    expect(execute).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO campaign_state"),
      expect.arrayContaining(["camp-1"])
    );
  });
});
