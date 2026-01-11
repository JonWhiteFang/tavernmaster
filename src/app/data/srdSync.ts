import { getDatabase } from "./db";
import manifest from "../../assets/srd/manifest.json";
import entries51 from "../../assets/srd/5.1/entries.json";
import entries521 from "../../assets/srd/5.2.1/entries.json";

export type SrdVersion = "5.1" | "5.2.1";

export type SrdEntryType =
  | "spell"
  | "monster"
  | "magic_item"
  | "feat"
  | "equipment"
  | "class"
  | "subclass"
  | "background"
  | "species"
  | "rule"
  | "glossary_term"
  | "condition";

export interface SrdEntry {
  id: string;
  name: string;
  type: SrdEntryType;
  srd_version: SrdVersion;
  data_json: Record<string, unknown>;
  search_text?: string;
  source_json?: Record<string, unknown>;
}

interface ManifestDataset {
  version: string;
  sourcePdfUrl: string;
  sourcePdfSha256: string;
  generatedAt: string;
  entriesPath: string;
}

interface Manifest {
  datasets: ManifestDataset[];
}

const typedManifest = manifest as Manifest;

function computeManifestHash(): string {
  // Simple hash based on manifest content
  const content = JSON.stringify(typedManifest);
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

async function getMetaValue(key: string): Promise<string | null> {
  const db = await getDatabase();
  const rows = await db.select<{ value: string }[]>("SELECT value FROM srd_meta WHERE key = ?", [
    key
  ]);
  return rows[0]?.value ?? null;
}

async function setMetaValue(key: string, value: string): Promise<void> {
  const db = await getDatabase();
  await db.execute("INSERT OR REPLACE INTO srd_meta (key, value) VALUES (?, ?)", [key, value]);
}

function getEntriesForVersion(version: SrdVersion): SrdEntry[] {
  switch (version) {
    case "5.1":
      return entries51 as SrdEntry[];
    case "5.2.1":
      return entries521 as SrdEntry[];
    default:
      return [];
  }
}

async function syncVersion(version: SrdVersion, now: string): Promise<number> {
  const db = await getDatabase();
  const entries = getEntriesForVersion(version);
  const importedIds = new Set<string>();

  // Batch upsert entries
  for (const entry of entries) {
    await db.execute(
      `INSERT OR REPLACE INTO srd_entries 
       (id, name, type, srd_version, data_json, search_text, source_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entry.id,
        entry.name,
        entry.type,
        entry.srd_version,
        JSON.stringify(entry.data_json),
        entry.search_text ?? null,
        entry.source_json ? JSON.stringify(entry.source_json) : null,
        now,
        now
      ]
    );
    importedIds.add(entry.id);
  }

  // Delete stale entries for this version
  const existingRows = await db.select<{ id: string }[]>(
    "SELECT id FROM srd_entries WHERE srd_version = ?",
    [version]
  );
  for (const row of existingRows) {
    if (!importedIds.has(row.id)) {
      await db.execute("DELETE FROM srd_entries WHERE id = ?", [row.id]);
    }
  }

  return entries.length;
}

export async function syncSrdIfNeeded(): Promise<void> {
  const manifestHash = computeManifestHash();
  const storedHash = await getMetaValue("srd_manifest_hash");

  if (storedHash === manifestHash) {
    // Already synced with current manifest
    return;
  }

  const now = new Date().toISOString();
  let totalEntries = 0;

  // Sync each version
  for (const dataset of typedManifest.datasets) {
    const version = dataset.version as SrdVersion;
    const count = await syncVersion(version, now);
    totalEntries += count;
  }

  // Update meta
  await setMetaValue("srd_manifest_hash", manifestHash);
  await setMetaValue("srd_last_imported_at", now);

  console.log(`SRD sync complete: ${totalEntries} entries imported`);
}

export async function getSrdDatasetStatus(): Promise<{
  manifestHash: string;
  importedHash: string | null;
  versions: string[];
}> {
  const manifestHash = computeManifestHash();
  const importedHash = await getMetaValue("srd_manifest_hash");
  const versions = typedManifest.datasets.map((d) => d.version);

  return { manifestHash, importedHash, versions };
}
