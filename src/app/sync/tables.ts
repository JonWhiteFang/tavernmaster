export type SyncedTable =
  | "campaigns"
  | "sessions"
  | "journal_entries"
  | "characters"
  | "character_stats"
  | "character_abilities"
  | "character_inventory"
  | "character_spells"
  | "encounters"
  | "initiative_entries"
  | "conditions"
  | "encounter_conditions"
  | "action_proposals"
  | "combat_log"
  | "ai_logs"
  | "app_settings";

export type TableSpec = {
  table: SyncedTable;
  primaryKey: "id" | "key";
  columns: readonly string[];
  syncFilter?: (row: Record<string, unknown>) => boolean;
};

export const syncedTables: readonly TableSpec[] = [
  {
    table: "campaigns",
    primaryKey: "id",
    columns: ["id", "name", "summary", "active_scene_id", "deleted_at", "created_at", "updated_at"]
  },
  {
    table: "sessions",
    primaryKey: "id",
    columns: [
      "id",
      "campaign_id",
      "title",
      "started_at",
      "ended_at",
      "recap",
      "deleted_at",
      "created_at",
      "updated_at"
    ]
  },
  {
    table: "journal_entries",
    primaryKey: "id",
    columns: [
      "id",
      "campaign_id",
      "title",
      "content",
      "tags",
      "deleted_at",
      "created_at",
      "updated_at"
    ]
  },
  {
    table: "characters",
    primaryKey: "id",
    columns: [
      "id",
      "name",
      "role",
      "control_mode",
      "level",
      "class_name",
      "ancestry",
      "background",
      "alignment",
      "proficiencies_json",
      "ancestry_bonus_json",
      "deleted_at",
      "created_at",
      "updated_at"
    ]
  },
  {
    table: "character_stats",
    primaryKey: "id",
    columns: [
      "id",
      "character_id",
      "hp",
      "hp_max",
      "ac",
      "initiative_bonus",
      "speed",
      "deleted_at",
      "created_at",
      "updated_at"
    ]
  },
  {
    table: "character_abilities",
    primaryKey: "id",
    columns: [
      "id",
      "character_id",
      "ability",
      "score",
      "save_bonus",
      "deleted_at",
      "created_at",
      "updated_at"
    ]
  },
  {
    table: "character_inventory",
    primaryKey: "id",
    columns: [
      "id",
      "character_id",
      "item_id",
      "quantity",
      "attuned",
      "deleted_at",
      "created_at",
      "updated_at"
    ]
  },
  {
    table: "character_spells",
    primaryKey: "id",
    columns: [
      "id",
      "character_id",
      "spell_id",
      "prepared",
      "slots_used",
      "deleted_at",
      "created_at",
      "updated_at"
    ]
  },
  {
    table: "encounters",
    primaryKey: "id",
    columns: [
      "id",
      "campaign_id",
      "name",
      "environment",
      "difficulty",
      "round",
      "active_turn_id",
      "deleted_at",
      "created_at",
      "updated_at"
    ]
  },
  {
    table: "initiative_entries",
    primaryKey: "id",
    columns: [
      "id",
      "encounter_id",
      "character_id",
      "order_index",
      "deleted_at",
      "created_at",
      "updated_at"
    ]
  },
  {
    table: "conditions",
    primaryKey: "id",
    columns: [
      "id",
      "name",
      "rules_ref",
      "duration_rounds",
      "deleted_at",
      "created_at",
      "updated_at"
    ]
  },
  {
    table: "encounter_conditions",
    primaryKey: "id",
    columns: [
      "id",
      "encounter_id",
      "condition_id",
      "target_id",
      "deleted_at",
      "created_at",
      "updated_at"
    ]
  },
  {
    table: "action_proposals",
    primaryKey: "id",
    columns: [
      "id",
      "encounter_id",
      "character_id",
      "summary",
      "rules_refs",
      "status",
      "deleted_at",
      "created_at",
      "updated_at"
    ]
  },
  {
    table: "combat_log",
    primaryKey: "id",
    columns: [
      "id",
      "encounter_id",
      "entry_type",
      "payload_json",
      "deleted_at",
      "created_at",
      "updated_at"
    ]
  },
  {
    table: "ai_logs",
    primaryKey: "id",
    columns: [
      "id",
      "campaign_id",
      "session_id",
      "kind",
      "content",
      "payload_json",
      "deleted_at",
      "created_at",
      "updated_at"
    ]
  },
  {
    table: "app_settings",
    primaryKey: "key",
    columns: ["key", "value_json", "deleted_at", "created_at", "updated_at"],
    // Only sync "app_settings" key; "ui_state" stays local-only (active campaign/session/encounter IDs)
    syncFilter: (row) => row.key === "app_settings"
  }
] as const;

export function getTableSpec(table: SyncedTable): TableSpec {
  const spec = syncedTables.find((entry) => entry.table === table);
  if (!spec) {
    throw new Error(`Missing table spec for ${table}`);
  }
  return spec;
}

export function buildSqliteUpsertStatement(spec: TableSpec): string {
  const columnList = spec.columns.join(", ");
  const placeholders = spec.columns.map(() => "?").join(", ");
  const updates = spec.columns
    .filter((column) => column !== spec.primaryKey && column !== "created_at")
    .map((column) => `${column} = excluded.${column}`)
    .join(", ");

  return `INSERT INTO ${spec.table} (${columnList}) VALUES (${placeholders}) ON CONFLICT(${spec.primaryKey}) DO UPDATE SET ${updates}`;
}
