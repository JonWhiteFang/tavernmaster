export type SyncStatus = "idle" | "syncing" | "error" | "offline";

export const defaultSyncStatus: SyncStatus = "idle";

// TODO: wire Supabase client + single-user key once schema is finalized.
export function getSyncStatus(): SyncStatus {
  return defaultSyncStatus;
}
