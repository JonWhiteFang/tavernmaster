import { beforeEach, describe, expect, it, vi } from "vitest";
import { createJournalEntry, listJournalEntries, updateJournalEntry } from "./journal";
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

describe("journal data", () => {
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

  it("lists journal entries with decrypted content", async () => {
    select.mockResolvedValue([
      {
        id: "entry-1",
        campaign_id: "camp-1",
        title: "cipher",
        content: "cipher",
        created_at: "t1",
        updated_at: "t2"
      }
    ]);

    const entries = await listJournalEntries("camp-1");

    expect(entries).toEqual([
      {
        id: "entry-1",
        campaignId: "camp-1",
        title: "decrypted",
        content: "decrypted",
        createdAt: "t1",
        updatedAt: "t2"
      }
    ]);
  });

  it("creates a journal entry and enqueues sync", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:00:00Z"));

    const result = await createJournalEntry({
      campaignId: "camp-1",
      title: "Title",
      content: "Body"
    });

    expect(mockEncryptValue).toHaveBeenCalledWith("Title");
    expect(mockEncryptValue).toHaveBeenCalledWith("Body");
    expect(mockEnqueueUpsertAndSchedule).toHaveBeenCalledWith(
      "journal_entries",
      expect.any(String),
      expect.objectContaining({
        id: expect.any(String),
        campaign_id: "camp-1",
        title: "encrypted",
        content: "encrypted"
      })
    );
    expect(result).toMatchObject({
      id: expect.any(String),
      campaignId: "camp-1",
      title: "Title",
      content: "Body"
    });

    vi.useRealTimers();
  });

  it("updates a journal entry and enqueues sync", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-02-01T00:00:00Z"));

    const result = await updateJournalEntry({
      id: "entry-1",
      campaignId: "camp-1",
      title: "Title",
      content: "Body",
      createdAt: "2024-01-01T00:00:00.000Z"
    });

    expect(execute).toHaveBeenCalled();
    expect(mockEnqueueUpsertAndSchedule).toHaveBeenCalledWith(
      "journal_entries",
      "entry-1",
      expect.objectContaining({
        id: "entry-1",
        campaign_id: "camp-1",
        updated_at: "2024-02-01T00:00:00.000Z"
      })
    );
    expect(result).toMatchObject({
      id: "entry-1",
      campaignId: "camp-1",
      updatedAt: "2024-02-01T00:00:00.000Z"
    });

    vi.useRealTimers();
  });
});
