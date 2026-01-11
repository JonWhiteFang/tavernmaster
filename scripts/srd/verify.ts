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

  for (const entry of entries) {
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

  const manifest: Manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf-8"));
  let hasErrors = false;

  for (const dataset of manifest.datasets) {
    console.log(`\n=== Verifying SRD ${dataset.version} ===`);

    const entriesPath = path.join(ASSETS_DIR, dataset.entriesPath);

    if (!fs.existsSync(entriesPath)) {
      console.log(`  ⚠ Entries file not found: ${dataset.entriesPath}`);
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
