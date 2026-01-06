import type { SyncedTable } from "./tables";
import { schedulePush } from "./client";
import { enqueueUpsert } from "./queue";

export async function enqueueUpsertAndSchedule(
  entityType: SyncedTable,
  entityId: string,
  payload: unknown
): Promise<void> {
  await enqueueUpsert(entityType, entityId, payload);
  schedulePush();
}

export async function enqueueUpsertsAndSchedule(
  ops: Array<{ entityType: SyncedTable; entityId: string; payload: unknown }>
): Promise<void> {
  await Promise.all(ops.map((op) => enqueueUpsert(op.entityType, op.entityId, op.payload)));
  schedulePush();
}
