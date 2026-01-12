import { beforeEach, describe, expect, it, vi } from "vitest";

const execute = vi.fn();
const select = vi.fn();

vi.mock("@tauri-apps/plugin-sql", () => ({
  default: { load: vi.fn(async () => ({ execute, select })) }
}));

vi.mock("./schema", () => ({
  schemaStatements: ["CREATE TABLE test_table;"]
}));

describe("migrate", () => {
  beforeEach(() => {
    vi.resetModules();
    execute.mockClear();
    select.mockClear();
  });

  it("applies baseline migration when user_version is 0", async () => {
    select.mockResolvedValue([{ user_version: 0 }]);

    const { runMigrations } = await import("./migrate");
    const db = { execute, select } as never;

    await runMigrations(db);

    expect(execute).toHaveBeenCalledWith("CREATE TABLE test_table;");
    expect(execute).toHaveBeenCalledWith("PRAGMA user_version = 1;");
  });

  it("skips baseline migration when user_version is 1", async () => {
    select.mockResolvedValue([{ user_version: 1 }]);

    const { runMigrations } = await import("./migrate");
    const db = { execute, select } as never;

    await runMigrations(db);

    expect(execute).not.toHaveBeenCalledWith("CREATE TABLE test_table;");
    expect(execute).not.toHaveBeenCalledWith("PRAGMA user_version = 1;");
  });

  it("getUserVersion returns 0 when no rows", async () => {
    select.mockResolvedValue([]);

    const { getUserVersion } = await import("./migrate");
    const db = { execute, select } as never;

    const version = await getUserVersion(db);
    expect(version).toBe(0);
  });

  it("setUserVersion executes PRAGMA", async () => {
    const { setUserVersion } = await import("./migrate");
    const db = { execute, select } as never;

    await setUserVersion(db, 5);

    expect(execute).toHaveBeenCalledWith("PRAGMA user_version = 5;");
  });
});
