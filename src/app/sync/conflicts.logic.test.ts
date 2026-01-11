import { describe, expect, it } from "vitest";
import { shouldCreateConflict } from "./conflicts.logic";

describe("conflicts.logic", () => {
  it("returns false when no pending local op", () => {
    expect(
      shouldCreateConflict({
        hasPendingLocalOp: false,
        localUpdatedAt: "2024-01-01T00:00:00Z",
        remoteUpdatedAt: "2024-01-02T00:00:00Z"
      })
    ).toBe(false);
  });

  it("returns false when no remote update", () => {
    expect(
      shouldCreateConflict({
        hasPendingLocalOp: true,
        localUpdatedAt: "2024-01-01T00:00:00Z",
        remoteUpdatedAt: null
      })
    ).toBe(false);
  });

  it("returns true when pending op and no local timestamp", () => {
    expect(
      shouldCreateConflict({
        hasPendingLocalOp: true,
        localUpdatedAt: null,
        remoteUpdatedAt: "2024-01-02T00:00:00Z"
      })
    ).toBe(true);
  });

  it("returns true when remote is newer than local", () => {
    expect(
      shouldCreateConflict({
        hasPendingLocalOp: true,
        localUpdatedAt: "2024-01-01T00:00:00Z",
        remoteUpdatedAt: "2024-01-02T00:00:00Z"
      })
    ).toBe(true);
  });

  it("returns false when local is newer than remote", () => {
    expect(
      shouldCreateConflict({
        hasPendingLocalOp: true,
        localUpdatedAt: "2024-01-02T00:00:00Z",
        remoteUpdatedAt: "2024-01-01T00:00:00Z"
      })
    ).toBe(false);
  });

  it("returns false when timestamps are equal", () => {
    expect(
      shouldCreateConflict({
        hasPendingLocalOp: true,
        localUpdatedAt: "2024-01-01T00:00:00Z",
        remoteUpdatedAt: "2024-01-01T00:00:00Z"
      })
    ).toBe(false);
  });
});
