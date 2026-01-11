#!/usr/bin/env node
/**
 * Generate SRD 5.2.1 dataset
 *
 * For now, creates a minimal dataset based on 5.1 structure.
 * In production, this would parse the 5.2.1 PDF.
 *
 * Run with: npx tsx scripts/srd/generate-521.ts
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { SrdEntry, SrdVersion } from "./types.js";
import { generateEntryId, generateSearchText } from "./types.js";

const ASSETS_DIR = path.resolve(import.meta.dirname, "../../src/assets/srd");
const INPUT_PATH = path.join(ASSETS_DIR, "5.1/entries.json");
const OUTPUT_PATH = path.join(ASSETS_DIR, "5.2.1/entries.json");
const MANIFEST_PATH = path.join(ASSETS_DIR, "manifest.json");

const VERSION: SrdVersion = "5.2.1";
const PDF_URL = "https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf";

function main() {
  console.log("Generating SRD 5.2.1 dataset...\n");

  // Read 5.1 entries as base
  const entries51: SrdEntry[] = JSON.parse(fs.readFileSync(INPUT_PATH, "utf-8"));

  // Convert to 5.2.1 format
  // Note: In 5.2.1, "races" become "species" and backgrounds have different structure
  const entries521: SrdEntry[] = entries51.map((entry) => {
    const newId = generateEntryId(VERSION, entry.type, entry.name);
    return {
      ...entry,
      id: newId,
      srd_version: VERSION,
      search_text: generateSearchText(entry.name, entry.data_json),
      source_json: {
        pdfUrl: PDF_URL,
        pdfSha256: "",
        section: entry.type
      }
    };
  });

  // Write entries
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(entries521, null, 2));
  console.log(`Wrote ${entries521.length} entries to 5.2.1/entries.json`);

  // Count by type
  const byType: Record<string, number> = {};
  for (const entry of entries521) {
    byType[entry.type] = (byType[entry.type] || 0) + 1;
  }
  for (const [type, count] of Object.entries(byType)) {
    console.log(`  ${type}: ${count}`);
  }

  // Update manifest
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf-8"));
  const dataset = manifest.datasets.find((d: { version: string }) => d.version === "5.2.1");
  if (dataset) {
    dataset.generatedAt = new Date().toISOString();
  }
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  console.log("\nUpdated manifest.json");
}

main();
