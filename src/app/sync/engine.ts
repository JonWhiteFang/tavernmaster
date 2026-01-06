import { getDatabase } from "../data/db";
import { getSupabaseClient } from "./supabase";
import { deleteOp, ensureSyncState, hasPendingOp, listPendingOps, updateSyncState } from "./queue";
import { buildSqliteUpsertStatement, getTableSpec, syncedTables, type SyncedTable } from "./tables";
import { hasOpenConflict, upsertConflict } from "./conflicts";
import { shouldCreateConflict } from "./conflicts.logic";

type SyncResult = { ok: true } | { ok: false; error: string };

function normalizeRow(row: Record<string, unknown>): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    normalized[key] = value === undefined ? null : value;
  }
  return normalized;
}

export async function pushPendingOps(): Promise<SyncResult> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      ok: false,
      error: "Supabase is not configured (missing VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY)."
    };
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) {
    return { ok: false, error: sessionError.message };
  }
  if (!sessionData.session) {
    return { ok: false, error: "Not signed in." };
  }

  const ops = await listPendingOps(200);
  for (const op of ops) {
    if (op.op_type !== "upsert") {
      continue;
    }

    const conflict = await hasOpenConflict(op.entity_type, op.entity_id);
    if (conflict) {
      continue;
    }

    let payload: unknown;
    try {
      payload = JSON.parse(op.payload_json) as unknown;
    } catch {
      return { ok: false, error: `Invalid payload JSON for ${op.id}` };
    }

    const row = normalizeRow(payload as Record<string, unknown>);
    const { error } = await supabase.from(op.entity_type).upsert(row, {
      onConflict: op.entity_type === "app_settings" ? "key" : "id"
    });
    if (error) {
      return { ok: false, error: error.message };
    }

    await deleteOp(op.id);
  }

  await updateSyncState({ lastPushedAt: new Date().toISOString() });
  return { ok: true };
}

async function getLocalUpdatedAt(table: SyncedTable, primaryKey: "id" | "key", id: string) {
  const db = await getDatabase();
  const rows = await db.select<{ updated_at: string }[]>(
    `SELECT updated_at FROM ${table} WHERE ${primaryKey} = ? LIMIT 1`,
    [id]
  );
  return rows[0]?.updated_at ?? null;
}

async function applyRemoteRow(table: SyncedTable, row: Record<string, unknown>): Promise<void> {
  const spec = getTableSpec(table);
  const primaryKeyValue = String(row[spec.primaryKey] ?? "");
  if (!primaryKeyValue) {
    return;
  }

  if (spec.syncFilter && !spec.syncFilter(row)) {
    return;
  }

  const hasConflict = await hasOpenConflict(table, primaryKeyValue);
  if (hasConflict) {
    return;
  }

  const isQueued = await hasPendingOp(table, primaryKeyValue);

  const remoteUpdatedAt = typeof row.updated_at === "string" ? row.updated_at : null;
  const localUpdatedAt = await getLocalUpdatedAt(table, spec.primaryKey, primaryKeyValue);
  if (
    shouldCreateConflict({
      hasPendingLocalOp: isQueued,
      localUpdatedAt,
      remoteUpdatedAt
    })
  ) {
    const db = await getDatabase();
    const localRows = await db.select<Record<string, unknown>[]>(
      `SELECT ${spec.columns.join(", ")} FROM ${table} WHERE ${spec.primaryKey} = ? LIMIT 1`,
      [primaryKeyValue]
    );
    const localPayload = localRows[0] ?? { [spec.primaryKey]: primaryKeyValue };

    await upsertConflict({
      entityType: table,
      entityId: primaryKeyValue,
      localPayload,
      remotePayload: row,
      localUpdatedAt,
      remoteUpdatedAt
    });
    return;
  }

  if (isQueued) {
    return;
  }

  if (remoteUpdatedAt && localUpdatedAt && localUpdatedAt > remoteUpdatedAt) {
    return;
  }

  const values = spec.columns.map((column) => (row[column] === undefined ? null : row[column]));
  const db = await getDatabase();
  await db.execute(buildSqliteUpsertStatement(spec), values);
}

export async function pullRemoteChanges(): Promise<SyncResult> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      ok: false,
      error: "Supabase is not configured (missing VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY)."
    };
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) {
    return { ok: false, error: sessionError.message };
  }
  if (!sessionData.session) {
    return { ok: false, error: "Not signed in." };
  }

  const state = await ensureSyncState();
  const since = state.last_pulled_at ?? "1970-01-01T00:00:00.000Z";

  for (const spec of syncedTables) {
    const { data, error } = await supabase
      .from(spec.table)
      .select(spec.columns.join(", "))
      .gt("updated_at", since)
      .order("updated_at", { ascending: true })
      .limit(2000);

    if (error) {
      return { ok: false, error: error.message };
    }

    const rows = (data ?? []) as Record<string, unknown>[];
    for (const row of rows) {
      await applyRemoteRow(spec.table, row);
    }
  }

  await updateSyncState({ lastPulledAt: new Date().toISOString() });
  return { ok: true };
}
