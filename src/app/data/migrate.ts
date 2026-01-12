import type Database from "@tauri-apps/plugin-sql";
import baseline from "./migrations/0001_baseline";

export interface Migration {
  version: number;
  name: string;
  up: (db: Database) => Promise<void>;
}

const migrations: Migration[] = [baseline];

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
    await migration.up(db);
    await setUserVersion(db, migration.version);
  }
}

export { migrations };
