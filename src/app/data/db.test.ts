import { beforeEach, describe, expect, it, vi } from "vitest";

const execute = vi.fn();
const select = vi.fn();
const load = vi.fn(async () => ({ execute, select }));

vi.mock("@tauri-apps/plugin-sql", () => ({
  default: { load }
}));

const runMigrations = vi.fn();
vi.mock("./migrate", () => ({
  runMigrations
}));

describe("db", () => {
  beforeEach(() => {
    vi.resetModules();
    execute.mockClear();
    select.mockClear();
    load.mockClear();
    runMigrations.mockClear();
    select.mockResolvedValue([]);
  });

  it("caches the database connection", async () => {
    const { getDatabase } = await import("./db");

    await getDatabase();
    await getDatabase();

    expect(load).toHaveBeenCalledTimes(1);
  });

  it("initializes via migrations and adds missing columns", async () => {
    const { initDatabase } = await import("./db");

    await initDatabase();

    expect(runMigrations).toHaveBeenCalled();
    expect(execute).toHaveBeenCalledWith(
      expect.stringContaining("ALTER TABLE characters ADD COLUMN control_mode")
    );
    expect(execute).toHaveBeenCalledWith(
      expect.stringContaining("ALTER TABLE characters ADD COLUMN proficiencies_json")
    );
  });

  it("resetDatabaseForRestore clears cached connection", async () => {
    const { getDatabase, resetDatabaseForRestore } = await import("./db");

    await getDatabase();
    expect(load).toHaveBeenCalledTimes(1);

    resetDatabaseForRestore();

    await getDatabase();
    expect(load).toHaveBeenCalledTimes(2);
  });
});
