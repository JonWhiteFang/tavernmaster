import { getDatabase } from "../data/db";
import type { SyncedTable } from "./tables";

export type SyncOpType = "upsert";

export type SyncQueueRow = {
  id: string;
  entity_type: SyncedTable;
  entity_id: string;
  op_type: SyncOpType;
  payload_json: string;
  created_at: string;
  updated_at: string;
};

export type SyncStateRow = {
  id: string;
  last_pulled_at: string | null;
  last_pushed_at: string | null;
  conflict_count: number;
  created_at: string;
  updated_at: string;
};

const DEFAULT_SYNC_STATE_ID = "default";

export function makeSyncQueueId(entityType: SyncedTable, entityId: string): string {
  return `${entityType}:${entityId}`;
}

export async function ensureSyncState(): Promise<SyncStateRow> {
  const db = await getDatabase();
  const rows = await db.select<SyncStateRow[]>(
    "SELECT id, last_pulled_at, last_pushed_at, conflict_count, created_at, updated_at FROM sync_state WHERE id = ?",
    [DEFAULT_SYNC_STATE_ID]
  );

  if (rows.length) {
    return rows[0];
  }

  const now = new Date().toISOString();
  const state: SyncStateRow = {
    id: DEFAULT_SYNC_STATE_ID,
    last_pulled_at: null,
    last_pushed_at: null,
    conflict_count: 0,
    created_at: now,
    updated_at: now
  };

  await db.execute(
    `INSERT INTO sync_state (id, last_pulled_at, last_pushed_at, conflict_count, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [state.id, state.last_pulled_at, state.last_pushed_at, state.conflict_count, now, now]
  );

  return state;
}

export async function updateSyncState(patch: {
  lastPulledAt?: string | null;
  lastPushedAt?: string | null;
  conflictCount?: number;
}): Promise<void> {
  const db = await getDatabase();
  const existing = await ensureSyncState();
  const now = new Date().toISOString();
  await db.execute(
    `UPDATE sync_state
     SET last_pulled_at = ?, last_pushed_at = ?, conflict_count = ?, updated_at = ?
     WHERE id = ?`,
    [
      patch.lastPulledAt ?? existing.last_pulled_at,
      patch.lastPushedAt ?? existing.last_pushed_at,
      patch.conflictCount ?? existing.conflict_count,
      now,
      DEFAULT_SYNC_STATE_ID
    ]
  );
}

export async function enqueueUpsert(entityType: SyncedTable, entityId: string, payload: unknown) {
  const db = await getDatabase();
  const id = makeSyncQueueId(entityType, entityId);
  const now = new Date().toISOString();
  await db.execute(
    `INSERT INTO sync_queue (id, entity_type, entity_id, op_type, payload_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET payload_json = excluded.payload_json, updated_at = excluded.updated_at`,
    [id, entityType, entityId, "upsert", JSON.stringify(payload), now, now]
  );
}

export async function listPendingOps(limit = 100): Promise<SyncQueueRow[]> {
  const db = await getDatabase();
  return db.select<SyncQueueRow[]>(
    `SELECT id, entity_type, entity_id, op_type, payload_json, created_at, updated_at
     FROM sync_queue
     ORDER BY created_at ASC
     LIMIT ?`,
    [limit]
  );
}

export async function hasPendingOp(entityType: SyncedTable, entityId: string): Promise<boolean> {
  const db = await getDatabase();
  const id = makeSyncQueueId(entityType, entityId);
  const rows = await db.select<{ id: string }[]>("SELECT id FROM sync_queue WHERE id = ? LIMIT 1", [
    id
  ]);
  return rows.length > 0;
}

export async function deleteOp(id: string): Promise<void> {
  const db = await getDatabase();
  await db.execute("DELETE FROM sync_queue WHERE id = ?", [id]);
}

export async function deleteOpForEntity(entityType: SyncedTable, entityId: string): Promise<void> {
  const id = makeSyncQueueId(entityType, entityId);
  await deleteOp(id);
}
