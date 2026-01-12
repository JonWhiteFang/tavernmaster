import type { SyncConflictRow } from "./conflicts";

export interface ConflictDiff {
  field: string;
  local: unknown;
  remote: unknown;
}

export function diffConflict(conflict: SyncConflictRow): ConflictDiff[] {
  const diffs: ConflictDiff[] = [];

  try {
    const local = JSON.parse(conflict.local_payload_json) as Record<string, unknown>;
    const remote = JSON.parse(conflict.remote_payload_json) as Record<string, unknown>;

    const allKeys = new Set([...Object.keys(local), ...Object.keys(remote)]);

    for (const key of allKeys) {
      if (key === "updated_at" || key === "created_at") continue;

      const localVal = local[key];
      const remoteVal = remote[key];

      if (JSON.stringify(localVal) !== JSON.stringify(remoteVal)) {
        diffs.push({ field: key, local: localVal, remote: remoteVal });
      }
    }
  } catch {
    // Invalid JSON, return empty diffs
  }

  return diffs;
}

export function formatConflictSummary(conflict: SyncConflictRow): string {
  const diffs = diffConflict(conflict);
  if (diffs.length === 0) return "No differences found";

  return diffs
    .map((d) => `${d.field}: local="${String(d.local)}" vs remote="${String(d.remote)}"`)
    .join("\n");
}

export function canAutoResolve(conflict: SyncConflictRow): boolean {
  // Auto-resolve if only timestamps differ
  const diffs = diffConflict(conflict);
  return diffs.length === 0;
}
