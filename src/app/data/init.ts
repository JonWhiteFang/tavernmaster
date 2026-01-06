import { initDatabase } from "./db";
import { importSrdIfNeeded } from "./srd";
import { seedDatabase } from "./seed";

export async function initializeData(): Promise<void> {
  await initDatabase();
  await importSrdIfNeeded();
  await seedDatabase();
}
