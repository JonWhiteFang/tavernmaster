import Database from "@tauri-apps/plugin-sql";
import { schemaStatements } from "./schema";

const DATABASE_URL = "sqlite:tavernmaster.db";

let databasePromise: Promise<Database> | null = null;

type SqliteTableInfoRow = {
  name: string;
};

async function ensureColumn(
  db: Database,
  tableName: string,
  columnName: string,
  columnDefinition: string
): Promise<void> {
  const rows = await db.select<SqliteTableInfoRow[]>(`PRAGMA table_info(${tableName});`);
  const hasColumn = rows.some((row) => row.name === columnName);
  if (!hasColumn) {
    await db.execute(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition};`);
  }
}

async function ensureSoftDeleteColumns(db: Database): Promise<void> {
  const tablesWithSoftDeletes = [
    "campaigns",
    "sessions",
    "journal_entries",
    "characters",
    "character_stats",
    "character_abilities",
    "character_inventory",
    "character_spells",
    "encounters",
    "initiative_entries",
    "conditions",
    "encounter_conditions",
    "action_proposals",
    "combat_log",
    "app_settings",
    "ai_logs"
  ];

  for (const tableName of tablesWithSoftDeletes) {
    await ensureColumn(db, tableName, "deleted_at", "TEXT");
  }
}

export async function getDatabase(): Promise<Database> {
  if (!databasePromise) {
    databasePromise = Database.load(DATABASE_URL);
  }
  return databasePromise;
}

export async function withTransaction<T>(fn: (db: Database) => Promise<T>): Promise<T> {
  const db = await getDatabase();
  await db.execute("BEGIN");
  try {
    const result = await fn(db);
    await db.execute("COMMIT");
    return result;
  } catch (error) {
    await db.execute("ROLLBACK");
    throw error;
  }
}

export async function initDatabase(): Promise<void> {
  const db = await getDatabase();
  for (const statement of schemaStatements) {
    await db.execute(statement);
  }
  await ensureSoftDeleteColumns(db);
  await ensureColumn(db, "characters", "campaign_id", "TEXT");
  await ensureColumn(db, "characters", "control_mode", "TEXT NOT NULL DEFAULT 'player'");
  await ensureColumn(db, "characters", "proficiencies_json", "TEXT NOT NULL DEFAULT '[]'");
  await ensureColumn(db, "characters", "ancestry_bonus_json", "TEXT NOT NULL DEFAULT '[]'");
  await ensureColumn(db, "action_proposals", "payload_json", "TEXT");
}
