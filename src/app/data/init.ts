import { initDatabase } from "./db";
import { ensureSettings } from "./settings";
import { importSrdIfNeeded } from "./srd";
import { syncSrdIfNeeded } from "./srdSync";
import { seedDatabase } from "./seed";

export async function initializeData(): Promise<void> {
  await initDatabase();
  await ensureSettings();
  // Legacy SRD import for old tables (kept for backward compatibility)
  await importSrdIfNeeded();
  // New versioned SRD sync
  await syncSrdIfNeeded();
  await seedDatabase({ includeDemoData: false });
}
