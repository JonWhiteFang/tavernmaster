import Database from "@tauri-apps/plugin-sql";
import { schemaStatements } from "./schema";

const DATABASE_URL = "sqlite:tavernmaster.db";

let databasePromise: Promise<Database> | null = null;

export async function getDatabase(): Promise<Database> {
  if (!databasePromise) {
    databasePromise = Database.load(DATABASE_URL);
  }
  return databasePromise;
}

export async function initDatabase(): Promise<void> {
  const db = await getDatabase();
  for (const statement of schemaStatements) {
    await db.execute(statement);
  }
}
