import { describe, expect, it, vi, beforeEach } from "vitest";
import { decryptValue, encryptValue } from "./encryption";
import { invoke } from "@tauri-apps/api/core";

describe("encryption helpers", () => {
  const mockInvoke = vi.mocked(invoke);

  beforeEach(() => {
    mockInvoke.mockReset();
  });

  it("returns null for empty values", async () => {
    await expect(encryptValue(null)).resolves.toBeNull();
    await expect(encryptValue(undefined)).resolves.toBeNull();
    await expect(encryptValue("")).resolves.toBeNull();
    await expect(decryptValue(null)).resolves.toBeNull();
    await expect(decryptValue(undefined)).resolves.toBeNull();
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it("encrypts and decrypts values", async () => {
    mockInvoke.mockResolvedValueOnce("cipher").mockResolvedValueOnce("plain");

    await expect(encryptValue("secret")).resolves.toBe("cipher");
    await expect(decryptValue("cipher")).resolves.toBe("plain");

    expect(mockInvoke).toHaveBeenNthCalledWith(1, "encrypt_text", { plain: "secret" });
    expect(mockInvoke).toHaveBeenNthCalledWith(2, "decrypt_text", { payload: "cipher" });
  });

  it("returns raw payload when decryption fails", async () => {
    mockInvoke.mockRejectedValueOnce(new Error("boom"));

    await expect(decryptValue("payload")).resolves.toBe("payload");
  });
});
