import { beforeEach, describe, expect, it, vi } from "vitest";

const execute = vi.fn();
const select = vi.fn();

vi.mock("./db", () => ({
  getDatabase: vi.fn(async () => ({ execute, select })),
  withTransaction: vi.fn(async (fn) => fn({ execute, select }))
}));

describe("campaign_player", () => {
  beforeEach(() => {
    vi.resetModules();
    execute.mockClear();
    select.mockClear();
  });

  it("getPlayerCharacterId returns null when no row", async () => {
    select.mockResolvedValue([]);
    const { getPlayerCharacterId } = await import("./campaign_player");

    const result = await getPlayerCharacterId("campaign-1");

    expect(result).toBeNull();
    expect(select).toHaveBeenCalledWith(
      "SELECT player_character_id FROM campaign_player WHERE campaign_id = ?",
      ["campaign-1"]
    );
  });

  it("getPlayerCharacterId returns character id when exists", async () => {
    select.mockResolvedValue([{ player_character_id: "char-1" }]);
    const { getPlayerCharacterId } = await import("./campaign_player");

    const result = await getPlayerCharacterId("campaign-1");

    expect(result).toBe("char-1");
  });

  it("setPlayerCharacter upserts row", async () => {
    const { setPlayerCharacter } = await import("./campaign_player");

    await setPlayerCharacter("campaign-1", "char-2");

    expect(execute).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO campaign_player"),
      expect.arrayContaining(["campaign-1", "char-2"])
    );
  });

  it("setPlayerCharacter overwrites existing", async () => {
    const { setPlayerCharacter } = await import("./campaign_player");

    await setPlayerCharacter("campaign-1", "char-1");
    await setPlayerCharacter("campaign-1", "char-2");

    expect(execute).toHaveBeenCalledTimes(2);
  });

  it("clearPlayerCharacter deletes row", async () => {
    const { clearPlayerCharacter } = await import("./campaign_player");

    await clearPlayerCharacter("campaign-1");

    expect(execute).toHaveBeenCalledWith("DELETE FROM campaign_player WHERE campaign_id = ?", [
      "campaign-1"
    ]);
  });
});
