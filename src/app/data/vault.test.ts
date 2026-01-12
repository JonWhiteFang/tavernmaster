import { beforeEach, describe, expect, it, vi } from "vitest";

const invoke = vi.fn();

vi.mock("@tauri-apps/api/core", () => ({ invoke }));

describe("vault", () => {
  beforeEach(() => {
    vi.resetModules();
    invoke.mockClear();
  });

  it("vaultStatus calls correct command", async () => {
    invoke.mockResolvedValueOnce({ initialized: true, has_cached_key: true });
    const { vaultStatus } = await import("./vault");

    const result = await vaultStatus();

    expect(invoke).toHaveBeenCalledWith("vault_status");
    expect(result.initialized).toBe(true);
  });

  it("vaultInitialize calls correct command with passphrase", async () => {
    invoke.mockResolvedValueOnce("wrapped_bundle_base64");
    const { vaultInitialize } = await import("./vault");

    const result = await vaultInitialize("mypassphrase");

    expect(invoke).toHaveBeenCalledWith("vault_initialize", { passphrase: "mypassphrase" });
    expect(result).toBe("wrapped_bundle_base64");
  });

  it("vaultUnlock calls correct command", async () => {
    invoke.mockResolvedValueOnce(undefined);
    const { vaultUnlock } = await import("./vault");

    await vaultUnlock("mypassphrase", "wrapped_bundle");

    expect(invoke).toHaveBeenCalledWith("vault_unlock", {
      passphrase: "mypassphrase",
      wrappedBundle: "wrapped_bundle"
    });
  });

  it("vaultRewrap calls correct command", async () => {
    invoke.mockResolvedValueOnce("new_wrapped_bundle");
    const { vaultRewrap } = await import("./vault");

    const result = await vaultRewrap("oldpass", "newpass", "old_bundle");

    expect(invoke).toHaveBeenCalledWith("vault_rewrap", {
      oldPassphrase: "oldpass",
      newPassphrase: "newpass",
      wrappedBundle: "old_bundle"
    });
    expect(result).toBe("new_wrapped_bundle");
  });

  it("vaultGetDataKey calls correct command", async () => {
    invoke.mockResolvedValueOnce("data_key_base64");
    const { vaultGetDataKey } = await import("./vault");

    const result = await vaultGetDataKey();

    expect(invoke).toHaveBeenCalledWith("vault_get_data_key");
    expect(result).toBe("data_key_base64");
  });

  it("vaultLock calls correct command", async () => {
    invoke.mockResolvedValueOnce(undefined);
    const { vaultLock } = await import("./vault");

    await vaultLock();

    expect(invoke).toHaveBeenCalledWith("vault_lock");
  });
});
