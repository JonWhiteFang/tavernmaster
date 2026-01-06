import { getDatabase } from "../data/db";
import { buildSqliteUpsertStatement, getTableSpec, type SyncedTable } from "./tables";
import { deleteOpForEntity } from "./queue";
import { getOpenConflict, resolveConflict } from "./conflicts";
import { schedulePush } from "./client";

export async function keepRemoteForConflict(
  entityType: SyncedTable,
  entityId: string
): Promise<void> {
  const conflict = await getOpenConflict(entityType, entityId);
  if (!conflict) {
    return;
  }

  const spec = getTableSpec(entityType);
  const remote = JSON.parse(conflict.remote_payload_json) as Record<string, unknown>;
  const values = spec.columns.map((column) =>
    remote[column] === undefined ? null : remote[column]
  );

  const db = await getDatabase();
  await db.execute(buildSqliteUpsertStatement(spec), values);

  await deleteOpForEntity(entityType, entityId);
  await resolveConflict(entityType, entityId, "keep_remote");
}

export async function keepLocalForConflict(
  entityType: SyncedTable,
  entityId: string
): Promise<void> {
  const conflict = await getOpenConflict(entityType, entityId);
  if (!conflict) {
    return;
  }
  await resolveConflict(entityType, entityId, "keep_local");
  schedulePush(0);
}
