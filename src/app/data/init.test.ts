import { describe, expect, it, vi } from "vitest";
import { initializeData } from "./init";
import { initDatabase } from "./db";
import { ensureSettings } from "./settings";
import { importSrdIfNeeded } from "./srd";
import { syncSrdIfNeeded } from "./srdSync";
import { seedDatabase } from "./seed";

vi.mock("./db", () => ({
  initDatabase: vi.fn()
}));
vi.mock("./settings", () => ({
  ensureSettings: vi.fn()
}));
vi.mock("./srd", () => ({
  importSrdIfNeeded: vi.fn()
}));
vi.mock("./srdSync", () => ({
  syncSrdIfNeeded: vi.fn()
}));
vi.mock("./seed", () => ({
  seedDatabase: vi.fn()
}));

describe("initializeData", () => {
  it("initializes database, settings, SRD, and seed data", async () => {
    await initializeData();

    expect(initDatabase).toHaveBeenCalled();
    expect(ensureSettings).toHaveBeenCalled();
    expect(importSrdIfNeeded).toHaveBeenCalled();
    expect(syncSrdIfNeeded).toHaveBeenCalled();
    expect(seedDatabase).toHaveBeenCalledWith({ includeDemoData: false });
  });
});
