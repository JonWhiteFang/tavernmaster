import type Database from "@tauri-apps/plugin-sql";
import baseline from "./migrations/0001_baseline";
import campaignPlayerAndState from "./migrations/0002_campaign_player_and_state";
import cryptoMeta from "./migrations/0003_crypto_meta";
import indicesAndSearch from "./migrations/0004_indices_and_search";
import campaignStateJson from "./migrations/0005_campaign_state_json";
import turnsAndSnapshots from "./migrations/0006_turns_and_snapshots";
import canonStore from "./migrations/0007_canon_store";
import turnStatus from "./migrations/0008_turn_status";
import { backupDatabase, restoreDatabase } from "./backups";

export interface Migration {
  version: number;
  name: string;
  up: (db: Database) => Promise<void>;
}

export class MigrationError extends Error {
  constructor(
    message: string,
    public readonly fromVersion: number,
    public readonly toVersion: number,
    public readonly backupPath?: string
  ) {
    super(message);
    this.name = "MigrationError";
  }
}

const migrations: Migration[] = [
  baseline,
  campaignPlayerAndState,
  cryptoMeta,
  indicesAndSearch,
  campaignStateJson,
  turnsAndSnapshots,
  canonStore,
  turnStatus
];

type VersionRow = { user_version: number };

export async function getUserVersion(db: Database): Promise<number> {
  const rows = await db.select<VersionRow[]>("PRAGMA user_version;");
  return rows[0]?.user_version ?? 0;
}

export async function setUserVersion(db: Database, version: number): Promise<void> {
  await db.execute(`PRAGMA user_version = ${version};`);
}

export async function runMigrations(db: Database): Promise<void> {
  const currentVersion = await getUserVersion(db);

  const pending = migrations
    .filter((m) => m.version > currentVersion)
    .sort((a, b) => a.version - b.version);

  for (const migration of pending) {
    const fromVersion = await getUserVersion(db);
    let backupPath: string | undefined;

    try {
      backupPath = await backupDatabase(`pre-migration-v${fromVersion}-to-v${migration.version}`);
    } catch {
      // Continue without backup if it fails (e.g., no DB file yet)
    }

    try {
      await migration.up(db);
      await setUserVersion(db, migration.version);
    } catch (err) {
      if (backupPath) {
        try {
          await restoreDatabase(backupPath);
        } catch {
          // Restore failed, throw original error
        }
      }
      throw new MigrationError(
        err instanceof Error ? err.message : String(err),
        fromVersion,
        migration.version,
        backupPath
      );
    }
  }
}

export { migrations };
