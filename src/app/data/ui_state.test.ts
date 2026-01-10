import { beforeEach, describe, expect, it, vi } from "vitest";
import { getUiState, setUiState, migrateLocalStorageToUiState } from "./ui_state";
import { getDatabase } from "./db";

vi.mock("./db", () => ({
  getDatabase: vi.fn()
}));

describe("ui_state", () => {
  const mockDb = {
    select: vi.fn(),
    execute: vi.fn()
  };

  beforeEach(() => {
    vi.mocked(getDatabase).mockResolvedValue(mockDb as never);
    mockDb.select.mockReset();
    mockDb.execute.mockReset();
    window.localStorage.clear();
  });

  describe("getUiState", () => {
    it("returns default state when no row exists", async () => {
      mockDb.select.mockResolvedValue([]);
      const state = await getUiState();
      expect(state).toEqual({
        activeCampaignId: null,
        activeSessionId: null,
        activeEncounterId: null
      });
    });

    it("returns stored state from database", async () => {
      mockDb.select.mockResolvedValue([
        {
          value_json: JSON.stringify({
            activeCampaignId: "camp-1",
            activeSessionId: "sess-1",
            activeEncounterId: "enc-1"
          })
        }
      ]);
      const state = await getUiState();
      expect(state).toEqual({
        activeCampaignId: "camp-1",
        activeSessionId: "sess-1",
        activeEncounterId: "enc-1"
      });
    });

    it("returns default on error", async () => {
      mockDb.select.mockRejectedValue(new Error("db error"));
      const state = await getUiState();
      expect(state).toEqual({
        activeCampaignId: null,
        activeSessionId: null,
        activeEncounterId: null
      });
    });
  });

  describe("setUiState", () => {
    it("upserts state to database", async () => {
      mockDb.execute.mockResolvedValue(undefined);
      await setUiState({
        activeCampaignId: "camp-1",
        activeSessionId: null,
        activeEncounterId: null
      });
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO app_settings"),
        expect.arrayContaining(["ui_state"])
      );
    });
  });

  describe("migrateLocalStorageToUiState", () => {
    it("returns null when no localStorage data exists", async () => {
      const result = await migrateLocalStorageToUiState();
      expect(result).toBeNull();
    });

    it("migrates localStorage data and clears keys", async () => {
      window.localStorage.setItem("tm.activeCampaignId", JSON.stringify("camp-1"));
      window.localStorage.setItem("tm.activeSessionId", JSON.stringify("sess-1"));
      window.localStorage.setItem("tm.hasSelectedCampaign", JSON.stringify(true));
      window.localStorage.setItem("tm.hasSelectedSession", JSON.stringify(true));

      const result = await migrateLocalStorageToUiState();

      expect(result).toEqual({
        activeCampaignId: "camp-1",
        activeSessionId: "sess-1",
        activeEncounterId: null
      });
      expect(window.localStorage.getItem("tm.activeCampaignId")).toBeNull();
      expect(window.localStorage.getItem("tm.activeSessionId")).toBeNull();
    });

    it("respects hasSelectedCampaign flag", async () => {
      window.localStorage.setItem("tm.activeCampaignId", JSON.stringify("camp-1"));
      window.localStorage.setItem("tm.hasSelectedCampaign", JSON.stringify(false));

      const result = await migrateLocalStorageToUiState();

      expect(result).toEqual({
        activeCampaignId: null,
        activeSessionId: null,
        activeEncounterId: null
      });
    });
  });
});
