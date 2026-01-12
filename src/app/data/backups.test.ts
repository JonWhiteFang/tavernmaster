import { beforeEach, describe, expect, it, vi } from "vitest";

const invoke = vi.fn();

vi.mock("@tauri-apps/api/core", () => ({ invoke }));

describe("backups", () => {
  beforeEach(() => {
    vi.resetModules();
    invoke.mockClear();
  });

  it("getAppDataDir calls correct command", async () => {
    invoke.mockResolvedValueOnce("/path/to/app");
    const { getAppDataDir } = await import("./backups");

    const result = await getAppDataDir();

    expect(invoke).toHaveBeenCalledWith("get_app_data_dir");
    expect(result).toBe("/path/to/app");
  });

  it("backupDatabase calls correct command with reason", async () => {
    invoke.mockResolvedValueOnce("/path/to/backup.db");
    const { backupDatabase } = await import("./backups");

    const result = await backupDatabase("pre-migration");

    expect(invoke).toHaveBeenCalledWith("backup_database", { reason: "pre-migration" });
    expect(result).toBe("/path/to/backup.db");
  });

  it("listDatabaseBackups calls correct command", async () => {
    const backups = [{ path: "/backup.db", created_at: "20260112", reason: "test" }];
    invoke.mockResolvedValueOnce(backups);
    const { listDatabaseBackups } = await import("./backups");

    const result = await listDatabaseBackups();

    expect(invoke).toHaveBeenCalledWith("list_database_backups");
    expect(result).toEqual(backups);
  });

  it("restoreDatabase calls correct command with path", async () => {
    invoke.mockResolvedValueOnce(undefined);
    const { restoreDatabase } = await import("./backups");

    await restoreDatabase("/path/to/backup.db");

    expect(invoke).toHaveBeenCalledWith("restore_database", { backupPath: "/path/to/backup.db" });
  });
});
