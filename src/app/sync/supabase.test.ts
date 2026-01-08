import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { keychainStorage } from "./keychainStorage";

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn()
}));

describe("supabase", () => {
  const envSnapshot = { ...import.meta.env };

  beforeEach(() => {
    vi.resetModules();
    vi.mocked(createClient).mockReset();
    Object.assign(import.meta.env, envSnapshot);
  });

  it("returns null when configuration is missing", async () => {
    Object.assign(import.meta.env, {
      VITE_SUPABASE_URL: undefined,
      VITE_SUPABASE_ANON_KEY: undefined
    });
    const { getSupabaseClient } = await import("./supabase");

    expect(getSupabaseClient()).toBeNull();
    expect(createClient).not.toHaveBeenCalled();
  });

  it("creates and caches a client with keychain storage", async () => {
    Object.assign(import.meta.env, {
      VITE_SUPABASE_URL: "http://supabase.test",
      VITE_SUPABASE_ANON_KEY: "anon-key"
    });
    vi.mocked(createClient).mockReturnValue({} as never);
    const { getSupabaseClient } = await import("./supabase");

    const client = getSupabaseClient();

    expect(client).toBeTruthy();
    expect(createClient).toHaveBeenCalledWith(
      "http://supabase.test",
      "anon-key",
      expect.objectContaining({
        auth: expect.objectContaining({ storage: keychainStorage })
      })
    );
    expect(getSupabaseClient()).toBe(client);
  });
});
