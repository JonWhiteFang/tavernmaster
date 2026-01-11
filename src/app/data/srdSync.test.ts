import { describe, it, expect, beforeEach, vi } from "vitest";
import { syncSrdIfNeeded, getSrdDatasetStatus } from "./srdSync";

// Mock the database
vi.mock("./db", () => ({
  getDatabase: vi.fn(() => ({
    execute: vi.fn(),
    select: vi.fn().mockResolvedValue([])
  }))
}));

describe("srdSync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getSrdDatasetStatus", () => {
    it("returns manifest hash and versions", async () => {
      const status = await getSrdDatasetStatus();

      expect(status.manifestHash).toBeDefined();
      expect(status.versions).toContain("5.1");
      expect(status.versions).toContain("5.2.1");
    });
  });

  describe("syncSrdIfNeeded", () => {
    it("does not throw when called", async () => {
      await expect(syncSrdIfNeeded()).resolves.not.toThrow();
    });
  });
});
