#!/usr/bin/env node
/**
 * SRD Verify - Validates generated SRD data
 *
 * Checks:
 * - No duplicate IDs
 * - Required fields exist
 * - Minimum entry counts per type
 * - Known entries exist (sanity check)
 *
 * Run with: npx tsx scripts/srd/verify.ts
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { Manifest, SrdEntry, SrdVersion } from "./types.js";

const ASSETS_DIR = path.resolve(import.meta.dirname, "../../src/assets/srd");
const MANIFEST_PATH = path.join(ASSETS_DIR, "manifest.json");

// Minimum expected counts per type (based on actual SRD content)
// SRD 5.1 only has 1 background (Acolyte) and 1 feat (Grappler)
const MIN_COUNTS: Record<string, Record<string, number>> = {
  "5.1": {
    spell: 300,
    equipment: 200,
    monster: 300,
    condition: 10,
    rule: 1,
    class: 12,
    species: 10,
    background: 1,
    magic_item: 200,
    subclass: 10,
    feat: 1
  },
  "5.2.1": {
    spell: 500,
    equipment: 200,
    monster: 300,
    condition: 10,
    rule: 5,
    class: 12,
    species: 10,
    background: 10,
    magic_item: 200,
    subclass: 10,
    feat: 1
  }
};

// Known entries that must exist (sanity check)
const KNOWN_ENTRIES: Record<string, string[]> = {
  "5.1": [
    "srd:5.1:class:fighter",
    "srd:5.1:class:wizard",
    "srd:5.1:species:human",
    "srd:5.1:spell:fireball",
    "srd:5.1:monster:adult-red-dragon",
    "srd:5.1:background:acolyte"
  ],
  "5.2.1": [
    "srd:5.2.1:class:fighter",
    "srd:5.2.1:class:wizard",
    "srd:5.2.1:species:human",
    "srd:5.2.1:background:soldier"
  ]
};

interface VerifyResult {
  version: SrdVersion;
  totalEntries: number;
  entriesByType: Record<string, number>;
  errors: string[];
  warnings: string[];
}

function verifyEntries(version: SrdVersion, entries: SrdEntry[]): VerifyResult {
  const result: VerifyResult = {
    version,
    totalEntries: entries.length,
    entriesByType: {},
    errors: [],
    warnings: []
  };

  const seenIds = new Set<string>();
  const entryIds = new Set<string>();

  for (const entry of entries) {
    entryIds.add(entry.id);

    // Check for duplicate IDs
    if (seenIds.has(entry.id)) {
      result.errors.push(`Duplicate ID: ${entry.id}`);
    }
    seenIds.add(entry.id);

    // Check required fields
    if (!entry.id) result.errors.push(`Missing id for entry: ${entry.name}`);
    if (!entry.name) result.errors.push(`Missing name for entry: ${entry.id}`);
    if (!entry.type) result.errors.push(`Missing type for entry: ${entry.id}`);
    if (!entry.srd_version) result.errors.push(`Missing srd_version for entry: ${entry.id}`);
    if (!entry.data_json) result.errors.push(`Missing data_json for entry: ${entry.id}`);

    // Count by type
    result.entriesByType[entry.type] = (result.entriesByType[entry.type] || 0) + 1;
  }

  // Check minimum counts
  const minCounts = MIN_COUNTS[version] || {};
  for (const [type, minCount] of Object.entries(minCounts)) {
    const actual = result.entriesByType[type] || 0;
    if (actual < minCount) {
      result.errors.push(
        `Insufficient ${type} entries: expected at least ${minCount}, got ${actual}`
      );
    }
  }

  // Check known entries exist
  const knownEntries = KNOWN_ENTRIES[version] || [];
  for (const knownId of knownEntries) {
    if (!entryIds.has(knownId)) {
      result.errors.push(`Missing known entry: ${knownId}`);
    }
  }

  // Warn if no entries (expected during skeleton phase)
  if (entries.length === 0) {
    result.warnings.push(
      `No entries found for ${version} - this is expected during skeleton phase`
    );
  }

  return result;
}

async function main() {
  console.log("SRD Verify starting...\n");

  if (!fs.existsSync(MANIFEST_PATH)) {
    console.error("✗ Manifest file not found:", MANIFEST_PATH);
    process.exit(1);
  }

  const manifest: Manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf-8"));
  let hasErrors = false;

  for (const dataset of manifest.datasets) {
    console.log(`\n=== Verifying SRD ${dataset.version} ===`);

    const entriesPath = path.join(ASSETS_DIR, dataset.entriesPath);

    if (!fs.existsSync(entriesPath)) {
      console.log(`  ✗ Entries file not found: ${dataset.entriesPath}`);
      hasErrors = true;
      continue;
    }

    const entries: SrdEntry[] = JSON.parse(fs.readFileSync(entriesPath, "utf-8"));
    const result = verifyEntries(dataset.version as SrdVersion, entries);

    console.log(`  Total entries: ${result.totalEntries}`);
    if (Object.keys(result.entriesByType).length > 0) {
      console.log("  By type:");
      for (const [type, count] of Object.entries(result.entriesByType)) {
        console.log(`    ${type}: ${count}`);
      }
    }

    for (const warning of result.warnings) {
      console.log(`  ⚠ ${warning}`);
    }

    for (const error of result.errors) {
      console.log(`  ✗ ${error}`);
      hasErrors = true;
    }

    if (result.errors.length === 0) {
      console.log(`  ✓ Verification passed`);
    }
  }

  if (hasErrors) {
    console.log("\n✗ Verification failed with errors");
    process.exit(1);
  }

  console.log("\n✓ All verifications passed");
}

main().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
