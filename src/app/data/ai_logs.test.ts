import { beforeEach, describe, expect, it, vi } from "vitest";
import { insertAiLog, listAiLogs } from "./ai_logs";
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

describe("ai logs data", () => {
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
    mockEncryptValue.mockImplementation(async (value) => (value ? `enc:${value}` : null));
    mockDecryptValue.mockImplementation(async (value) => {
      if (value === "enc:payload") {
        return '{"ok":true}';
      }
      if (value === "enc:bad") {
        return "{";
      }
      if (value) {
        return value.replace("enc:", "");
      }
      return null;
    });
    mockEnqueueUpsertAndSchedule.mockResolvedValue();
  });

  it("inserts an ai log and enqueues sync", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:00:00Z"));

    const result = await insertAiLog({
      campaignId: "camp-1",
      sessionId: "sess-1",
      kind: "dm",
      content: "Hello",
      payload: { ok: true }
    });

    expect(execute).toHaveBeenCalled();
    expect(mockEnqueueUpsertAndSchedule).toHaveBeenCalledWith(
      "ai_logs",
      expect.any(String),
      expect.objectContaining({
        id: expect.any(String),
        campaign_id: "camp-1",
        session_id: "sess-1",
        content: "enc:Hello",
        payload_json: 'enc:{"ok":true}'
      })
    );
    expect(result).toMatchObject({
      id: expect.any(String),
      kind: "dm",
      content: "Hello",
      payload: { ok: true }
    });

    vi.useRealTimers();
  });

  it("lists ai logs and parses payloads", async () => {
    select.mockResolvedValue([
      {
        id: "1",
        campaign_id: "camp-1",
        session_id: null,
        kind: "dm",
        content: "enc:Hello",
        payload_json: "enc:payload",
        created_at: "t1",
        updated_at: "t2"
      },
      {
        id: "2",
        campaign_id: null,
        session_id: null,
        kind: "party",
        content: "enc:World",
        payload_json: "enc:bad",
        created_at: "t3",
        updated_at: "t4"
      }
    ]);

    const entries = await listAiLogs({});

    expect(entries).toEqual([
      {
        id: "1",
        campaignId: "camp-1",
        sessionId: undefined,
        kind: "dm",
        content: "Hello",
        payload: { ok: true },
        createdAt: "t1",
        updatedAt: "t2"
      },
      {
        id: "2",
        campaignId: undefined,
        sessionId: undefined,
        kind: "party",
        content: "World",
        payload: undefined,
        createdAt: "t3",
        updatedAt: "t4"
      }
    ]);
  });
});
