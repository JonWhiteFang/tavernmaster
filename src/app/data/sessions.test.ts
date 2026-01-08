import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSession, listSessions } from "./sessions";
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

describe("sessions data", () => {
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

  it("lists sessions with decrypted recaps", async () => {
    select.mockResolvedValue([
      {
        id: "sess-1",
        campaign_id: "camp-1",
        title: "Session 1",
        started_at: "t0",
        ended_at: null,
        recap: "cipher",
        created_at: "t1",
        updated_at: "t2"
      }
    ]);

    const sessions = await listSessions("camp-1");

    expect(sessions).toEqual([
      {
        id: "sess-1",
        campaignId: "camp-1",
        title: "Session 1",
        startedAt: "t0",
        endedAt: undefined,
        recap: "decrypted",
        createdAt: "t1",
        updatedAt: "t2"
      }
    ]);
  });

  it("creates a session and enqueues sync", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:00:00Z"));

    const result = await createSession({
      campaignId: "camp-1",
      title: "Session 1",
      recap: "Recap"
    });

    expect(mockEncryptValue).toHaveBeenCalledWith("Recap");
    expect(mockEnqueueUpsertAndSchedule).toHaveBeenCalledWith(
      "sessions",
      expect.any(String),
      expect.objectContaining({
        id: expect.any(String),
        campaign_id: "camp-1",
        recap: "encrypted"
      })
    );
    expect(result).toMatchObject({
      id: expect.any(String),
      campaignId: "camp-1",
      title: "Session 1",
      recap: "Recap",
      startedAt: "2024-01-01T00:00:00.000Z"
    });

    vi.useRealTimers();
  });
});
