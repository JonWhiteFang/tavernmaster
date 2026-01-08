import { beforeEach, describe, expect, it, vi } from "vitest";
import { deleteSecret, getSecret, setSecret } from "./secure";

vi.mock("./secure", () => ({
  deleteSecret: vi.fn(),
  getSecret: vi.fn(),
  setSecret: vi.fn()
}));

describe("keychainStorage", () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("uses keychain storage when available", async () => {
    vi.mocked(getSecret).mockResolvedValueOnce("token");
    const { keychainStorage } = await import("./keychainStorage");

    await expect(keychainStorage.getItem("session")).resolves.toBe("token");
    expect(getSecret).toHaveBeenCalledWith("supabase:session");

    await keychainStorage.setItem("session", "value");
    expect(setSecret).toHaveBeenCalledWith("supabase:session", "value");

    await keychainStorage.removeItem("session");
    expect(deleteSecret).toHaveBeenCalledWith("supabase:session");
  });

  it("falls back to localStorage when keychain fails", async () => {
    localStorage.setItem("session", "fallback");
    vi.mocked(getSecret).mockRejectedValueOnce(new Error("fail"));
    const { keychainStorage } = await import("./keychainStorage");

    await expect(keychainStorage.getItem("session")).resolves.toBe("fallback");
    expect(localStorage.getItem("session")).toBe("fallback");

    await keychainStorage.setItem("session", "local");
    expect(localStorage.getItem("session")).toBe("local");

    await keychainStorage.removeItem("session");
    expect(localStorage.getItem("session")).toBeNull();
  });
});
