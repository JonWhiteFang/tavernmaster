import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSupabaseClient } from "./supabase";
import { pullRemoteChanges, pushPendingOps } from "./engine";

vi.mock("./supabase", () => ({
  getSupabaseClient: vi.fn()
}));
vi.mock("./engine", () => ({
  pullRemoteChanges: vi.fn(),
  pushPendingOps: vi.fn()
}));

describe("sync client", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("reports offline when Supabase is not configured", async () => {
    vi.mocked(getSupabaseClient).mockReturnValue(null);
    const { getSyncStatus, initializeSync } = await import("./client");

    await initializeSync();

    expect(getSyncStatus()).toEqual({
      status: "offline",
      message: "Supabase not configured"
    });
  });

  it("initializes sync when signed in", async () => {
    const auth = {
      getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: "u1" } } } }),
      onAuthStateChange: vi.fn()
    };
    vi.mocked(getSupabaseClient).mockReturnValue({ auth } as never);
    vi.mocked(pullRemoteChanges).mockResolvedValue({ ok: true });
    vi.mocked(pushPendingOps).mockResolvedValue({ ok: true });
    const { getSyncStatus, initializeSync } = await import("./client");

    await initializeSync();

    expect(pullRemoteChanges).toHaveBeenCalled();
    expect(pushPendingOps).toHaveBeenCalled();
    expect(getSyncStatus().status).toBe("idle");
  });

  it("debounces scheduled pushes", async () => {
    vi.useFakeTimers();
    const auth = {
      getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: "u1" } } } }),
      onAuthStateChange: vi.fn()
    };
    vi.mocked(getSupabaseClient).mockReturnValue({ auth } as never);
    vi.mocked(pushPendingOps).mockResolvedValue({ ok: true });
    const { schedulePush } = await import("./client");

    schedulePush(1000);
    expect(pushPendingOps).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1000);
    await Promise.resolve();
    expect(pushPendingOps).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("syncs immediately on demand", async () => {
    const auth = {
      getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: "u1" } } } }),
      onAuthStateChange: vi.fn()
    };
    vi.mocked(getSupabaseClient).mockReturnValue({ auth } as never);
    vi.mocked(pushPendingOps).mockResolvedValue({ ok: true });
    vi.mocked(pullRemoteChanges).mockResolvedValue({ ok: true });
    const { syncNow } = await import("./client");

    await syncNow();

    expect(pushPendingOps).toHaveBeenCalled();
    expect(pullRemoteChanges).toHaveBeenCalled();
  });

  it("handles sign in and sign out flows", async () => {
    const auth = {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn(),
      signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
      signOut: vi.fn().mockResolvedValue(undefined)
    };
    vi.mocked(getSupabaseClient).mockReturnValue({ auth } as never);
    vi.mocked(pushPendingOps).mockResolvedValue({ ok: true });
    vi.mocked(pullRemoteChanges).mockResolvedValue({ ok: true });
    const { signInWithPassword, signOut } = await import("./client");

    await signInWithPassword("dm@example.test", "secret");
    expect(auth.signInWithPassword).toHaveBeenCalled();
    expect(pushPendingOps).toHaveBeenCalled();

    await signOut();
    expect(auth.signOut).toHaveBeenCalled();
  });
});
