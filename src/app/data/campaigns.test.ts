import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCampaign, listCampaigns } from "./campaigns";
import { getDatabase } from "./db";
import { decryptValue, encryptValue } from "./encryption";
import { enqueueUpsertAndSchedule } from "../sync/ops";

vi.mock("./db", () => ({
  getDatabase: vi.fn()
}));
vi.mock("./encryption", () => ({
  encryptValue: vi.fn(),
  decryptValue: vi.fn()
}));
vi.mock("../sync/ops", () => ({
  enqueueUpsertAndSchedule: vi.fn()
}));

describe("campaigns data", () => {
  const mockGetDatabase = vi.mocked(getDatabase);
  const mockEncryptValue = vi.mocked(encryptValue);
  const mockDecryptValue = vi.mocked(decryptValue);
  const mockEnqueueUpsertAndSchedule = vi.mocked(enqueueUpsertAndSchedule);

  const select = vi.fn();
  const execute = vi.fn();

  beforeEach(() => {
    select.mockReset();
    execute.mockReset();
    mockGetDatabase.mockResolvedValue({ select, execute } as never);
    mockEncryptValue.mockResolvedValue("encrypted");
    mockDecryptValue.mockImplementation(async (value) => (value ? "decrypted" : null));
    mockEnqueueUpsertAndSchedule.mockResolvedValue();
  });

  it("lists campaigns with decrypted summaries", async () => {
    select.mockResolvedValue([
      {
        id: "camp-1",
        name: "Quest",
        summary: "cipher",
        active_scene_id: null,
        ruleset_version: "5.1",
        created_at: "t1",
        updated_at: "t2"
      }
    ]);

    const campaigns = await listCampaigns();

    expect(campaigns).toEqual([
      {
        id: "camp-1",
        name: "Quest",
        summary: "decrypted",
        rulesetVersion: "5.1",
        activeSceneId: undefined,
        createdAt: "t1",
        updatedAt: "t2"
      }
    ]);
  });

  it("creates a campaign and enqueues sync", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:00:00Z"));

    const result = await createCampaign({ name: "New", summary: "Short" });

    expect(execute).toHaveBeenCalled();
    expect(mockEncryptValue).toHaveBeenCalledWith("Short");
    expect(mockEnqueueUpsertAndSchedule).toHaveBeenCalledWith(
      "campaigns",
      expect.any(String),
      expect.objectContaining({
        id: expect.any(String),
        name: "New",
        summary: "encrypted"
      })
    );
    expect(result).toMatchObject({
      id: expect.any(String),
      name: "New",
      summary: "Short",
      rulesetVersion: "5.1",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z"
    });

    vi.useRealTimers();
  });
});
