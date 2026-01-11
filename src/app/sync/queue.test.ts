import { describe, expect, it } from "vitest";
import { makeSyncQueueId } from "./queue";

describe("queue", () => {
  it("creates deterministic queue IDs", () => {
    expect(makeSyncQueueId("campaigns", "abc-123")).toBe("campaigns:abc-123");
    expect(makeSyncQueueId("characters", "xyz-789")).toBe("characters:xyz-789");
  });

  it("produces unique IDs for different entities", () => {
    const id1 = makeSyncQueueId("campaigns", "123");
    const id2 = makeSyncQueueId("sessions", "123");
    expect(id1).not.toBe(id2);
  });
});
