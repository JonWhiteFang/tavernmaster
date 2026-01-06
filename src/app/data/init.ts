import { initDatabase } from "./db";
import { ensureSettings } from "./settings";
import { importSrdIfNeeded } from "./srd";
import { seedDatabase } from "./seed";

export async function initializeData(): Promise<void> {
  await initDatabase();
  await ensureSettings();
  await importSrdIfNeeded();
  await seedDatabase();
}
