import { getDatabase } from "../data/db";
import type { SyncedTable } from "./tables";
import { updateSyncState } from "./queue";

export type SyncConflictResolution = "keep_local" | "keep_remote";

export type SyncConflictRow = {
  id: string;
  entity_type: SyncedTable;
  entity_id: string;
  local_payload_json: string;
  remote_payload_json: string;
  local_updated_at: string | null;
  remote_updated_at: string | null;
  resolved_at: string | null;
  resolution: SyncConflictResolution | null;
  created_at: string;
  updated_at: string;
};

export function makeConflictId(entityType: SyncedTable, entityId: string): string {
  return `${entityType}:${entityId}`;
}

export async function listOpenConflicts(limit = 100): Promise<SyncConflictRow[]> {
  const db = await getDatabase();
  return db.select<SyncConflictRow[]>(
    `SELECT id, entity_type, entity_id, local_payload_json, remote_payload_json,
            local_updated_at, remote_updated_at, resolved_at, resolution, created_at, updated_at
     FROM sync_conflicts
     WHERE resolved_at IS NULL
     ORDER BY created_at ASC
     LIMIT ?`,
    [limit]
  );
}

export async function countOpenConflicts(): Promise<number> {
  const db = await getDatabase();
  const rows = await db.select<{ count: number }[]>(
    "SELECT COUNT(*) as count FROM sync_conflicts WHERE resolved_at IS NULL"
  );
  return rows[0]?.count ?? 0;
}

async function syncConflictCountToState(): Promise<void> {
  const count = await countOpenConflicts();
  await updateSyncState({ conflictCount: count });
}

export async function hasOpenConflict(entityType: SyncedTable, entityId: string): Promise<boolean> {
  const db = await getDatabase();
  const id = makeConflictId(entityType, entityId);
  const rows = await db.select<{ id: string }[]>(
    "SELECT id FROM sync_conflicts WHERE id = ? AND resolved_at IS NULL LIMIT 1",
    [id]
  );
  return rows.length > 0;
}

export async function upsertConflict(params: {
  entityType: SyncedTable;
  entityId: string;
  localPayload: unknown;
  remotePayload: unknown;
  localUpdatedAt: string | null;
  remoteUpdatedAt: string | null;
}): Promise<void> {
  const db = await getDatabase();
  const id = makeConflictId(params.entityType, params.entityId);
  const now = new Date().toISOString();
  await db.execute(
    `INSERT INTO sync_conflicts
      (id, entity_type, entity_id, local_payload_json, remote_payload_json, local_updated_at, remote_updated_at,
       resolved_at, resolution, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       local_payload_json = excluded.local_payload_json,
       remote_payload_json = excluded.remote_payload_json,
       local_updated_at = excluded.local_updated_at,
       remote_updated_at = excluded.remote_updated_at,
       resolved_at = NULL,
       resolution = NULL,
       updated_at = excluded.updated_at`,
    [
      id,
      params.entityType,
      params.entityId,
      JSON.stringify(params.localPayload),
      JSON.stringify(params.remotePayload),
      params.localUpdatedAt,
      params.remoteUpdatedAt,
      null,
      null,
      now,
      now
    ]
  );

  await syncConflictCountToState();
}

export async function resolveConflict(
  entityType: SyncedTable,
  entityId: string,
  resolution: SyncConflictResolution
): Promise<void> {
  const db = await getDatabase();
  const id = makeConflictId(entityType, entityId);
  const now = new Date().toISOString();
  await db.execute(
    `UPDATE sync_conflicts
     SET resolved_at = ?, resolution = ?, updated_at = ?
     WHERE id = ?`,
    [now, resolution, now, id]
  );

  await syncConflictCountToState();
}

export async function getOpenConflict(
  entityType: SyncedTable,
  entityId: string
): Promise<SyncConflictRow | null> {
  const db = await getDatabase();
  const id = makeConflictId(entityType, entityId);
  const rows = await db.select<SyncConflictRow[]>(
    `SELECT id, entity_type, entity_id, local_payload_json, remote_payload_json,
            local_updated_at, remote_updated_at, resolved_at, resolution, created_at, updated_at
     FROM sync_conflicts
     WHERE id = ? AND resolved_at IS NULL
     LIMIT 1`,
    [id]
  );
  return rows[0] ?? null;
}
