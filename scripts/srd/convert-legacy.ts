#!/usr/bin/env node
/**
 * Convert existing srd.json to new entries format for SRD 5.1
 *
 * Run with: npx tsx scripts/srd/convert-legacy.ts
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { SrdEntry, SrdEntryType, SrdVersion } from "./types.js";
import { generateEntryId, generateSearchText } from "./types.js";

const ASSETS_DIR = path.resolve(import.meta.dirname, "../../src/assets/srd");
const LEGACY_PATH = path.join(ASSETS_DIR, "srd.json");
const OUTPUT_PATH = path.join(ASSETS_DIR, "5.1/entries.json");
const MANIFEST_PATH = path.join(ASSETS_DIR, "manifest.json");

interface LegacyEntry {
  id: string;
  name: string;
  data: Record<string, unknown>;
}

interface LegacySrd {
  spells: LegacyEntry[];
  items: LegacyEntry[];
  monsters: LegacyEntry[];
  conditions: LegacyEntry[];
  rules: LegacyEntry[];
  classes: LegacyEntry[];
  races: LegacyEntry[];
  backgrounds: LegacyEntry[];
}

const VERSION: SrdVersion = "5.1";
const PDF_URL = "https://media.wizards.com/2023/downloads/dnd/SRD_CC_v5.1.pdf";

function convertEntry(legacy: LegacyEntry, type: SrdEntryType): SrdEntry {
  const id = generateEntryId(VERSION, type, legacy.name);
  return {
    id,
    name: legacy.name,
    type,
    srd_version: VERSION,
    data_json: legacy.data,
    search_text: generateSearchText(legacy.name, legacy.data),
    source_json: {
      pdfUrl: PDF_URL,
      pdfSha256: "",
      section: type
    }
  };
}

function main() {
  console.log("Converting legacy srd.json to new format...\n");

  const legacy: LegacySrd = JSON.parse(fs.readFileSync(LEGACY_PATH, "utf-8"));
  const entries: SrdEntry[] = [];

  // Convert each category
  const mappings: Array<[keyof LegacySrd, SrdEntryType]> = [
    ["spells", "spell"],
    ["items", "equipment"],
    ["monsters", "monster"],
    ["conditions", "condition"],
    ["rules", "rule"],
    ["classes", "class"],
    ["races", "species"],
    ["backgrounds", "background"]
  ];

  for (const [key, type] of mappings) {
    const items = legacy[key] || [];
    for (const item of items) {
      entries.push(convertEntry(item, type));
    }
    console.log(`  ${type}: ${items.length} entries`);
  }

  // Write entries
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(entries, null, 2));
  console.log(`\nWrote ${entries.length} entries to 5.1/entries.json`);

  // Update manifest with generation timestamp
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf-8"));
  const dataset = manifest.datasets.find((d: { version: string }) => d.version === "5.1");
  if (dataset) {
    dataset.generatedAt = new Date().toISOString();
  }
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  console.log("Updated manifest.json");
}

main();
