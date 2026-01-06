import { describe, expect, it } from "vitest";
import { shouldCreateConflict } from "./conflicts.logic";

describe("shouldCreateConflict", () => {
  it("returns false without a pending local op", () => {
    expect(
      shouldCreateConflict({
        hasPendingLocalOp: false,
        localUpdatedAt: "2026-01-01T00:00:00.000Z",
        remoteUpdatedAt: "2026-01-02T00:00:00.000Z"
      })
    ).toBe(false);
  });

  it("returns true when remote is newer than local and local has pending op", () => {
    expect(
      shouldCreateConflict({
        hasPendingLocalOp: true,
        localUpdatedAt: "2026-01-01T00:00:00.000Z",
        remoteUpdatedAt: "2026-01-02T00:00:00.000Z"
      })
    ).toBe(true);
  });

  it("returns false when remote is older or equal", () => {
    expect(
      shouldCreateConflict({
        hasPendingLocalOp: true,
        localUpdatedAt: "2026-01-02T00:00:00.000Z",
        remoteUpdatedAt: "2026-01-01T00:00:00.000Z"
      })
    ).toBe(false);
    expect(
      shouldCreateConflict({
        hasPendingLocalOp: true,
        localUpdatedAt: "2026-01-02T00:00:00.000Z",
        remoteUpdatedAt: "2026-01-02T00:00:00.000Z"
      })
    ).toBe(false);
  });

  it("returns true when local has pending op and local timestamp is missing", () => {
    expect(
      shouldCreateConflict({
        hasPendingLocalOp: true,
        localUpdatedAt: null,
        remoteUpdatedAt: "2026-01-02T00:00:00.000Z"
      })
    ).toBe(true);
  });
});
