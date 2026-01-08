import { beforeEach, describe, expect, it, vi } from "vitest";

const execute = vi.fn();
const select = vi.fn();
const load = vi.fn(async () => ({ execute, select }));

vi.mock("@tauri-apps/plugin-sql", () => ({
  default: { load }
}));
vi.mock("./schema", () => ({
  schemaStatements: ["CREATE TABLE one;", "CREATE TABLE two;"]
}));

describe("db", () => {
  beforeEach(() => {
    vi.resetModules();
    execute.mockClear();
    select.mockClear();
    load.mockClear();
    select.mockResolvedValue([]);
  });

  it("caches the database connection", async () => {
    const { getDatabase } = await import("./db");

    await getDatabase();
    await getDatabase();

    expect(load).toHaveBeenCalledTimes(1);
  });

  it("initializes schema and adds missing columns", async () => {
    const { initDatabase } = await import("./db");

    await initDatabase();

    expect(execute).toHaveBeenCalledWith("CREATE TABLE one;");
    expect(execute).toHaveBeenCalledWith("CREATE TABLE two;");
    expect(execute).toHaveBeenCalledWith(
      expect.stringContaining("ALTER TABLE characters ADD COLUMN control_mode")
    );
    expect(execute).toHaveBeenCalledWith(
      expect.stringContaining("ALTER TABLE characters ADD COLUMN proficiencies_json")
    );
  });
});
