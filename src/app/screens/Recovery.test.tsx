import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import Recovery from "./Recovery";
import { MigrationError } from "../data/migrate";

const listDatabaseBackups = vi.fn();
const restoreDatabase = vi.fn();
const resetDatabaseForRestore = vi.fn();

vi.mock("../data/backups", () => ({
  listDatabaseBackups: () => listDatabaseBackups(),
  restoreDatabase: (path: string) => restoreDatabase(path)
}));

vi.mock("../data/db", () => ({
  resetDatabaseForRestore: () => resetDatabaseForRestore()
}));

describe("Recovery", () => {
  const error = new MigrationError("Test failure", 0, 1, "/path/to/backup.db");
  const onRetry = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders error details", () => {
    render(<Recovery error={error} onRetry={onRetry} />);

    expect(screen.getByText(/Database Migration Failed/)).toBeInTheDocument();
    expect(screen.getByText(/version 0 to 1/)).toBeInTheDocument();
    expect(screen.getByText(/Test failure/)).toBeInTheDocument();
    expect(screen.getByText(/\/path\/to\/backup.db/)).toBeInTheDocument();
  });

  it("calls onRetry when Retry clicked", () => {
    render(<Recovery error={error} onRetry={onRetry} />);

    fireEvent.click(screen.getByText("Retry"));

    expect(onRetry).toHaveBeenCalled();
  });

  it("restores from backup when clicked", async () => {
    listDatabaseBackups.mockResolvedValue([
      { path: "/backup.db", created_at: "now", reason: "test" }
    ]);
    restoreDatabase.mockResolvedValue(undefined);

    render(<Recovery error={error} onRetry={onRetry} />);

    fireEvent.click(screen.getByText("Restore Latest Backup"));

    await waitFor(() => {
      expect(restoreDatabase).toHaveBeenCalledWith("/backup.db");
      expect(resetDatabaseForRestore).toHaveBeenCalled();
    });
  });

  it("shows error when no backups available", async () => {
    listDatabaseBackups.mockResolvedValue([]);

    render(<Recovery error={error} onRetry={onRetry} />);

    fireEvent.click(screen.getByText("Restore Latest Backup"));

    await waitFor(() => {
      expect(screen.getByText(/No backups available/)).toBeInTheDocument();
    });
  });
});
