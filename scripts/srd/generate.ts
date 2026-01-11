#!/usr/bin/env node
/**
 * SRD Generator - Main entry point
 *
 * Downloads SRD PDFs, extracts content, and generates entries.json files.
 * Run with: npx tsx scripts/srd/generate.ts
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";
import type { Manifest, SrdEntry, SrdVersion } from "./types.js";

const ASSETS_DIR = path.resolve(import.meta.dirname, "../../src/assets/srd");
const MANIFEST_PATH = path.join(ASSETS_DIR, "manifest.json");

async function downloadPdf(url: string, destPath: string): Promise<string> {
  console.log(`Downloading ${url}...`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download: ${response.status}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(destPath, buffer);
  const hash = crypto.createHash("sha256").update(buffer).digest("hex");
  console.log(`Downloaded to ${destPath} (sha256: ${hash.slice(0, 16)}...)`);
  return hash;
}

async function generateForVersion(
  version: SrdVersion,
  pdfUrl: string
): Promise<{ entries: SrdEntry[]; sha256: string }> {
  const tempDir = path.join(ASSETS_DIR, ".temp");
  fs.mkdirSync(tempDir, { recursive: true });
  const pdfPath = path.join(tempDir, `srd-${version}.pdf`);

  // Download PDF
  const sha256 = await downloadPdf(pdfUrl, pdfPath);

  // For now, return empty entries - PDF parsing will be added incrementally
  // This skeleton allows the pipeline to run and produce valid output
  console.log(`PDF parsing for ${version} not yet implemented - generating empty entries`);
  const entries: SrdEntry[] = [];

  // Cleanup temp file
  fs.unlinkSync(pdfPath);
  fs.rmdirSync(tempDir, { recursive: true });

  return { entries, sha256 };
}

async function main() {
  console.log("SRD Generator starting...\n");

  const manifest: Manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf-8"));
  const now = new Date().toISOString();

  for (const dataset of manifest.datasets) {
    console.log(`\n=== Processing SRD ${dataset.version} ===`);

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
    console.log(`Wrote ${entries.length} entries to ${dataset.entriesPath}`);
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
