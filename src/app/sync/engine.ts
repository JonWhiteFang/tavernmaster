import { getDatabase } from "../data/db";
import { getSupabaseClient } from "./supabase";
import { deleteOp, ensureSyncState, hasPendingOp, listPendingOps, updateSyncState } from "./queue";
import { buildSqliteUpsertStatement, getTableSpec, syncedTables, type SyncedTable } from "./tables";
import { hasOpenConflict, upsertConflict } from "./conflicts";
import { shouldCreateConflict } from "./conflicts.logic";

type SyncResult = { ok: true } | { ok: false; error: string };

const SYNC_TIMEOUT_MS = 8000;

async function withTimeout<T>(
  promise: Promise<T>,
  label: string,
  ms = SYNC_TIMEOUT_MS
): Promise<T> {
  let timeoutId: ReturnType<typeof globalThis.setTimeout> | null = null;
  const timeoutPromise = new Promise<T>((_resolve, reject) => {
    timeoutId = globalThis.setTimeout(() => reject(new Error(`timeout:${label}`)), ms);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId !== null) {
      globalThis.clearTimeout(timeoutId);
    }
  }
}

function normalizeRow(row: Record<string, unknown>): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    normalized[key] = value === undefined ? null : value;
  }
  return normalized;
}

export async function pushPendingOps(): Promise<SyncResult> {
  const startedAt = Date.now();
  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      ok: false,
      error: "Supabase is not configured (missing VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY)."
    };
  }

  let sessionResponse: Awaited<ReturnType<typeof supabase.auth.getSession>>;
  try {
    sessionResponse = await withTimeout(supabase.auth.getSession(), "auth.getSession");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      ok: false,
      error: `Push timed out at auth session load (${message}). Try restarting the app and signing in again.`
    };
  }
  const { data: sessionData, error: sessionError } = sessionResponse;
  if (sessionError) {
    return { ok: false, error: sessionError.message };
  }
  if (!sessionData.session) {
    return { ok: false, error: "Not signed in." };
  }

  let ops: Awaited<ReturnType<typeof listPendingOps>>;
  try {
    ops = await withTimeout(listPendingOps(200), "sqlite.listPendingOps");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { ok: false, error: `Push timed out reading local sync queue (${message}).` };
  }
  for (const op of ops) {
    if (op.op_type !== "upsert") {
      continue;
    }

    let conflict = false;
    try {
      conflict = await withTimeout(
        hasOpenConflict(op.entity_type, op.entity_id),
        "sqlite.hasOpenConflict"
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return { ok: false, error: `Push timed out checking conflicts (${message}).` };
    }
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
    let upsertResponse: Awaited<ReturnType<ReturnType<typeof supabase.from>["upsert"]>>;
    try {
      upsertResponse = await withTimeout(
        supabase.from(op.entity_type).upsert(row, {
          onConflict: op.entity_type === "app_settings" ? "key" : "id"
        }),
        `rest.upsert.${op.entity_type}`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      const elapsedMs = Date.now() - startedAt;
      return {
        ok: false,
        error: `Push timed out upserting ${op.entity_type} (${message}) after ${elapsedMs}ms.`
      };
    }
    const { error } = upsertResponse;
    if (error) {
      return { ok: false, error: error.message };
    }

    try {
      await withTimeout(deleteOp(op.id), "sqlite.deleteOp");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return { ok: false, error: `Push timed out updating local queue (${message}).` };
    }
  }

  try {
    await withTimeout(
      updateSyncState({ lastPushedAt: new Date().toISOString() }),
      "sqlite.updateSyncState"
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { ok: false, error: `Push completed but timed out updating sync state (${message}).` };
  }
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
