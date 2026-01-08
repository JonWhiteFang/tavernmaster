import { describe, expect, it, vi } from "vitest";
import { deleteSecret, getSecret, setSecret } from "./secure";
import { invoke } from "@tauri-apps/api/core";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn()
}));

describe("secure", () => {
  it("writes secrets via Tauri invoke", async () => {
    await setSecret("key", "value");

    expect(invoke).toHaveBeenCalledWith("set_secret", { key: "key", value: "value" });
  });

  it("reads secrets via Tauri invoke", async () => {
    vi.mocked(invoke).mockResolvedValueOnce({ value: "stored" });

    const result = await getSecret("key");

    expect(invoke).toHaveBeenCalledWith("get_secret", { key: "key" });
    expect(result).toBe("stored");
  });

  it("deletes secrets via Tauri invoke", async () => {
    await deleteSecret("key");

    expect(invoke).toHaveBeenCalledWith("delete_secret", { key: "key" });
  });
});
