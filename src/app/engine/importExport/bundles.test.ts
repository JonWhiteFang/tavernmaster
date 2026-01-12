import { describe, expect, it } from "vitest";
import {
  createBundleMeta,
  deserializeBundle,
  remapBundleIds,
  serializeBundle,
  validateBundle,
  type CampaignBundle
} from "./bundles";

describe("bundles", () => {
  const validBundle: CampaignBundle = {
    meta: {
      version: 1,
      appVersion: "0.1.0",
      schemaVersion: 10,
      exportedAt: "2024-01-01T00:00:00Z",
      campaignId: "camp-1",
      campaignName: "Test Campaign"
    },
    campaign: { id: "camp-1", name: "Test Campaign" },
    turns: [{ id: "turn-1", campaign_id: "camp-1", player_input: "test" }],
    canonFacts: [{ id: "fact-1", campaign_id: "camp-1", key: "npc:bob" }]
  };

  describe("createBundleMeta", () => {
    it("creates meta with current timestamp", () => {
      const meta = createBundleMeta("camp-1", "My Campaign", 10);
      expect(meta.campaignId).toBe("camp-1");
      expect(meta.campaignName).toBe("My Campaign");
      expect(meta.schemaVersion).toBe(10);
      expect(meta.exportedAt).toBeDefined();
    });
  });

  describe("validateBundle", () => {
    it("validates correct bundle", () => {
      const result = validateBundle(validBundle);
      expect(result.valid).toBe(true);
      expect(result.bundle).toBeDefined();
    });

    it("rejects invalid bundle", () => {
      const result = validateBundle({ meta: {} });
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("serializeBundle / deserializeBundle", () => {
    it("roundtrips bundle", () => {
      const json = serializeBundle(validBundle);
      const result = deserializeBundle(json);
      expect(result.valid).toBe(true);
      expect(result.bundle?.meta.campaignId).toBe("camp-1");
    });

    it("handles invalid JSON", () => {
      const result = deserializeBundle("not json");
      expect(result.valid).toBe(false);
    });
  });

  describe("remapBundleIds", () => {
    it("generates new campaign id", () => {
      const remapped = remapBundleIds(validBundle);
      expect(remapped.meta.campaignId).not.toBe("camp-1");
      expect(remapped.campaign.id).toBe(remapped.meta.campaignId);
    });

    it("remaps turn campaign ids", () => {
      const remapped = remapBundleIds(validBundle);
      expect(remapped.turns?.[0].campaign_id).toBe(remapped.meta.campaignId);
      expect(remapped.turns?.[0].id).not.toBe("turn-1");
    });

    it("remaps canon fact campaign ids", () => {
      const remapped = remapBundleIds(validBundle);
      expect(remapped.canonFacts?.[0].campaign_id).toBe(remapped.meta.campaignId);
    });
  });
});
