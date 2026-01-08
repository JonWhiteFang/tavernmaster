import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn()
}));

describe("supabase", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.mocked(createClient).mockReset();
    vi.unstubAllEnvs();
  });

  it("returns null when configuration is missing", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "");
    const { getSupabaseClient } = await import("./supabase");

    expect(getSupabaseClient()).toBeNull();
    expect(createClient).not.toHaveBeenCalled();
  });

  it("creates and caches a client with keychain storage", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "http://supabase.test");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "anon-key");
    vi.mocked(createClient).mockReturnValue({} as never);
    const { getSupabaseClient } = await import("./supabase");

    const client = getSupabaseClient();

    expect(client).toBeTruthy();
    expect(createClient).toHaveBeenCalledWith(
      "http://supabase.test",
      "anon-key",
      expect.objectContaining({
        auth: expect.objectContaining({
          storage: expect.objectContaining({
            getItem: expect.any(Function),
            setItem: expect.any(Function),
            removeItem: expect.any(Function)
          })
        })
      })
    );
    expect(getSupabaseClient()).toBe(client);
  });
});
