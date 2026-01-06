import { getSupabaseClient } from "./supabase";
import { pullRemoteChanges, pushPendingOps } from "./engine";

export type SyncStatus = "idle" | "syncing" | "error" | "offline";

type Listener = (status: SyncStatus, message: string | null) => void;

let currentStatus: SyncStatus = "offline";
let currentMessage: string | null = null;
let listeners: Listener[] = [];
let pushTimer: number | null = null;
let pullInterval: number | null = null;

function setStatus(status: SyncStatus, message: string | null = null) {
  currentStatus = status;
  currentMessage = message;
  for (const listener of listeners) {
    listener(status, message);
  }
}

export function getSyncStatus() {
  return { status: currentStatus, message: currentMessage };
}

export function subscribeSyncStatus(listener: Listener): () => void {
  listeners = [...listeners, listener];
  listener(currentStatus, currentMessage);
  return () => {
    listeners = listeners.filter((entry) => entry !== listener);
  };
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseClient() !== null;
}

export async function initializeSync(): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    setStatus("offline", "Supabase not configured");
    return;
  }

  const { data } = await supabase.auth.getSession();
  setStatus(data.session ? "idle" : "offline", data.session ? null : "Not signed in");

  supabase.auth.onAuthStateChange((_event, session) => {
    setStatus(session ? "idle" : "offline", session ? null : "Not signed in");
  });

  if (!pullInterval) {
    pullInterval = window.setInterval(() => {
      void pullOnce();
    }, 30_000);
  }

  const pulled = await pullOnce();
  if (pulled) {
    await pushOnce();
  }
}

export function schedulePush(debounceMs = 2000) {
  if (pushTimer) {
    window.clearTimeout(pushTimer);
  }
  pushTimer = window.setTimeout(() => {
    pushTimer = null;
    void pushOnce();
  }, debounceMs);
}

export async function syncNow(): Promise<void> {
  const pushed = await pushOnce();
  if (!pushed) {
    return;
  }
  await pullOnce();
}

async function pushOnce(): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    setStatus("offline", "Supabase not configured");
    return false;
  }

  setStatus("syncing", "Pushing changes...");
  const result = await pushPendingOps();
  if (!result.ok) {
    setStatus(result.error === "Not signed in." ? "offline" : "error", result.error);
    return false;
  }
  setStatus("idle", null);
  return true;
}

async function pullOnce(): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    setStatus("offline", "Supabase not configured");
    return false;
  }

  setStatus("syncing", "Pulling changes...");
  const result = await pullRemoteChanges();
  if (!result.ok) {
    setStatus(result.error === "Not signed in." ? "offline" : "error", result.error);
    return false;
  }
  setStatus("idle", null);
  return true;
}

export async function signInWithPassword(email: string, password: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    setStatus("offline", "Supabase not configured");
    throw new Error("Supabase not configured");
  }

  setStatus("syncing", "Signing in...");
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    setStatus("error", error.message);
    throw error;
  }

  setStatus("idle", null);
  await syncNow();
}

export async function signOut(): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    setStatus("offline", "Supabase not configured");
    return;
  }
  await supabase.auth.signOut();
  setStatus("offline", "Not signed in");
}
