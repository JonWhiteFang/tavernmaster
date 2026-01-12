import { beforeEach, describe, expect, it, vi } from "vitest";

const execute = vi.fn();
const select = vi.fn();

vi.mock("./db", () => ({
  getDatabase: vi.fn(async () => ({ execute, select }))
}));

describe("search_index", () => {
  beforeEach(() => {
    vi.resetModules();
    execute.mockClear();
    select.mockClear();
  });

  it("upsertSearchEntry deletes then inserts", async () => {
    const { upsertSearchEntry } = await import("./search_index");

    await upsertSearchEntry("session", "sess-1", "camp-1", "Test content");

    expect(execute).toHaveBeenCalledWith(
      "DELETE FROM search_index WHERE entity_type = ? AND entity_id = ?",
      ["session", "sess-1"]
    );
    expect(execute).toHaveBeenCalledWith(
      "INSERT INTO search_index (entity_type, entity_id, campaign_id, content) VALUES (?, ?, ?, ?)",
      ["session", "sess-1", "camp-1", "Test content"]
    );
  });

  it("deleteSearchEntry removes entry", async () => {
    const { deleteSearchEntry } = await import("./search_index");

    await deleteSearchEntry("journal", "j-1");

    expect(execute).toHaveBeenCalledWith(
      "DELETE FROM search_index WHERE entity_type = ? AND entity_id = ?",
      ["journal", "j-1"]
    );
  });

  it("searchContent queries FTS with campaign filter", async () => {
    select.mockResolvedValue([
      { entity_type: "session", entity_id: "s-1", campaign_id: "c-1", snippet: "test" }
    ]);
    const { searchContent } = await import("./search_index");

    const results = await searchContent("dragon", "c-1", 10);

    expect(select).toHaveBeenCalledWith(expect.stringContaining("MATCH"), ["dragon", "c-1", 10]);
    expect(results).toHaveLength(1);
    expect(results[0].entityType).toBe("session");
  });

  it("searchContent works without campaign filter", async () => {
    select.mockResolvedValue([]);
    const { searchContent } = await import("./search_index");

    await searchContent("goblin");

    expect(select).toHaveBeenCalledWith(expect.stringContaining("MATCH"), ["goblin", 50]);
  });
});
