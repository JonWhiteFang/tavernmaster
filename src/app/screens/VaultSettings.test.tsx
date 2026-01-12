import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import VaultSettings from "./VaultSettings";

const vaultStatus = vi.fn();
const vaultInitialize = vi.fn();
const vaultUnlock = vi.fn();
const vaultLock = vi.fn();
const vaultRewrap = vi.fn();
const select = vi.fn();
const execute = vi.fn();

vi.mock("../data/vault", () => ({
  vaultStatus: () => vaultStatus(),
  vaultInitialize: (p: string) => vaultInitialize(p),
  vaultUnlock: (p: string, b: string) => vaultUnlock(p, b),
  vaultLock: () => vaultLock(),
  vaultRewrap: (o: string, n: string, b: string) => vaultRewrap(o, n, b)
}));

vi.mock("../data/db", () => ({
  getDatabase: vi.fn(async () => ({ select, execute }))
}));

describe("VaultSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    select.mockResolvedValue([]);
  });

  it("shows loading then status", async () => {
    vaultStatus.mockResolvedValue({ initialized: false, has_cached_key: false });

    render(<VaultSettings />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Not Configured")).toBeInTheDocument();
    });
  });

  it("initializes vault when button clicked", async () => {
    vaultStatus.mockResolvedValue({ initialized: false, has_cached_key: false });
    vaultInitialize.mockResolvedValue("wrapped_bundle");
    execute.mockResolvedValue(undefined);

    render(<VaultSettings />);

    await waitFor(() => {
      expect(screen.getByText("Initialize Vault")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText("Enter passphrase"), {
      target: { value: "mypassword123" }
    });
    fireEvent.click(screen.getByText("Initialize Vault"));

    await waitFor(() => {
      expect(vaultInitialize).toHaveBeenCalledWith("mypassword123");
    });
  });

  it("shows unlock button when vault configured but locked", async () => {
    vaultStatus.mockResolvedValue({ initialized: true, has_cached_key: false });
    select.mockResolvedValue([{ value: "existing_bundle" }]);

    render(<VaultSettings />);

    await waitFor(() => {
      expect(screen.getByText("Unlock")).toBeInTheDocument();
    });
  });
});
