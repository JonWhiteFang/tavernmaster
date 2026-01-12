import { describe, expect, it } from "vitest";
import { canAutoResolve, diffConflict, formatConflictSummary } from "./conflictDiff";
import type { SyncConflictRow } from "./conflicts";

const makeConflict = (
  local: Record<string, unknown>,
  remote: Record<string, unknown>
): SyncConflictRow => ({
  id: "test",
  entity_type: "campaigns",
  entity_id: "camp-1",
  local_payload_json: JSON.stringify(local),
  remote_payload_json: JSON.stringify(remote),
  local_updated_at: "2024-01-01",
  remote_updated_at: "2024-01-02",
  resolved_at: null,
  resolution: null,
  created_at: "2024-01-01",
  updated_at: "2024-01-01"
});

describe("conflictDiff", () => {
  describe("diffConflict", () => {
    it("finds differing fields", () => {
      const conflict = makeConflict(
        { name: "Local", summary: "Same" },
        { name: "Remote", summary: "Same" }
      );
      const diffs = diffConflict(conflict);

      expect(diffs).toHaveLength(1);
      expect(diffs[0].field).toBe("name");
      expect(diffs[0].local).toBe("Local");
      expect(diffs[0].remote).toBe("Remote");
    });

    it("ignores timestamp fields", () => {
      const conflict = makeConflict(
        { name: "Same", updated_at: "2024-01-01" },
        { name: "Same", updated_at: "2024-01-02" }
      );
      const diffs = diffConflict(conflict);

      expect(diffs).toHaveLength(0);
    });

    it("handles invalid JSON", () => {
      const conflict: SyncConflictRow = {
        ...makeConflict({}, {}),
        local_payload_json: "invalid"
      };
      const diffs = diffConflict(conflict);

      expect(diffs).toEqual([]);
    });
  });

  describe("formatConflictSummary", () => {
    it("formats diffs as readable string", () => {
      const conflict = makeConflict({ name: "A" }, { name: "B" });
      const summary = formatConflictSummary(conflict);

      expect(summary).toContain("name");
      expect(summary).toContain("A");
      expect(summary).toContain("B");
    });
  });

  describe("canAutoResolve", () => {
    it("returns true when no real diffs", () => {
      const conflict = makeConflict({ name: "Same" }, { name: "Same" });
      expect(canAutoResolve(conflict)).toBe(true);
    });

    it("returns false when diffs exist", () => {
      const conflict = makeConflict({ name: "A" }, { name: "B" });
      expect(canAutoResolve(conflict)).toBe(false);
    });
  });
});
