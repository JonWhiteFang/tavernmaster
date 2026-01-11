#!/usr/bin/env node
/**
 * SRD Generator - Main entry point
 *
 * Downloads SRD PDFs, extracts content, and generates entries.json files.
 * Run with: npx tsx scripts/srd/generate.ts
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { Manifest, SrdEntry, SrdVersion } from "./types.js";
import { downloadPdf } from "./download.js";
import { extractPdfText } from "./extract.js";
import { segmentPages } from "./segment.js";

const ASSETS_DIR = path.resolve(import.meta.dirname, "../../src/assets/srd");
const MANIFEST_PATH = path.join(ASSETS_DIR, "manifest.json");

async function generateForVersion(
  version: SrdVersion,
  pdfUrl: string
): Promise<{ entries: SrdEntry[]; sha256: string }> {
  console.log(`\n  Downloading PDF...`);
  const { path: pdfPath, sha256 } = await downloadPdf(pdfUrl, version);

  console.log(`  Extracting text from PDF...`);
  const pages = await extractPdfText(pdfPath);
  console.log(`  Extracted ${pages.length} pages`);

  console.log(`  Segmenting into entries...`);
  const entries = segmentPages(pages, {
    version,
    pdfUrl,
    pdfSha256: sha256
  });

  // Count by type
  const byType: Record<string, number> = {};
  for (const entry of entries) {
    byType[entry.type] = (byType[entry.type] || 0) + 1;
  }
  console.log(`  Generated ${entries.length} entries:`);
  for (const [type, count] of Object.entries(byType).sort()) {
    console.log(`    ${type}: ${count}`);
  }

  return { entries, sha256 };
}

async function main() {
  console.log("SRD Generator starting...");

  const manifest: Manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf-8"));
  const now = new Date().toISOString();

  for (const dataset of manifest.datasets) {
    console.log(`\n=== Processing SRD ${dataset.version} ===`);

    try {
      const { entries, sha256 } = await generateForVersion(
        dataset.version as SrdVersion,
        dataset.sourcePdfUrl
      );

      // Update manifest
      dataset.sourcePdfSha256 = sha256;
      dataset.generatedAt = now;

      // Write entries
      const entriesPath = path.join(ASSETS_DIR, dataset.entriesPath);
      fs.mkdirSync(path.dirname(entriesPath), { recursive: true });
      fs.writeFileSync(entriesPath, JSON.stringify(entries, null, 2));
      console.log(`  Wrote to ${dataset.entriesPath}`);
    } catch (error) {
      console.error(`  Error processing ${dataset.version}:`, error);
      throw error;
    }
  }

  // Write updated manifest
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  console.log("\nUpdated manifest.json");
  console.log("\nSRD generation complete!");
}

main().catch((err) => {
  console.error("Generation failed:", err);
  process.exit(1);
});
