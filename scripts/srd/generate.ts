#!/usr/bin/env node
/**
 * SRD Generator - Main entry point
 *
 * For SRD 5.1: Uses 5e-bits/5e-database (comprehensive, well-structured)
 * For SRD 5.2.1: Uses PDF parsing (5e-database doesn't have 5.2 data yet)
 *
 * Run with: npx tsx scripts/srd/generate.ts
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { Manifest, SrdEntry, SrdVersion } from "./types.js";
import { fetch5eDatabase } from "./fetch-5e-database.js";
import { downloadPdf } from "./download.js";
import { extractPdfText } from "./extract.js";
import { segmentPages } from "./segment.js";

const ASSETS_DIR = path.resolve(import.meta.dirname, "../../src/assets/srd");
const MANIFEST_PATH = path.join(ASSETS_DIR, "manifest.json");

async function generateFromPdf(
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

  // First, generate 5.1 data from 5e-database
  const dataset51 = manifest.datasets.find((d) => d.version === "5.1")!;
  console.log(`\n=== Processing SRD 5.1 ===`);

  const { path: pdfPath51, sha256: sha51 } = await downloadPdf(dataset51.sourcePdfUrl, "5.1");

  const entries51 = await fetch5eDatabase("5.1", {
    pdfUrl: dataset51.sourcePdfUrl,
    pdfSha256: sha51
  });

  dataset51.sourcePdfSha256 = sha51;
  dataset51.generatedAt = now;

  const entriesPath51 = path.join(ASSETS_DIR, dataset51.entriesPath);
  fs.mkdirSync(path.dirname(entriesPath51), { recursive: true });
  fs.writeFileSync(entriesPath51, JSON.stringify(entries51, null, 2));
  console.log(`  Wrote to ${dataset51.entriesPath}`);

  // Now generate 5.2.1 - use 5.1 data as base, supplement with PDF parsing
  const dataset521 = manifest.datasets.find((d) => d.version === "5.2.1")!;
  console.log(`\n=== Processing SRD 5.2.1 ===`);

  const { sha256: sha521 } = await downloadPdf(dataset521.sourcePdfUrl, "5.2.1");

  // Start with PDF-parsed data for spells (5.2.1 has many new/updated spells)
  const pdfResult = await generateFromPdf("5.2.1", dataset521.sourcePdfUrl);

  // Convert 5.1 entries to 5.2.1 format for types that PDF parsing doesn't handle well
  const entries521: SrdEntry[] = [];

  // Use PDF-parsed spells (5.2.1 has significant spell changes)
  const pdfSpells = pdfResult.entries.filter((e) => e.type === "spell");
  entries521.push(...pdfSpells);

  // Use 5.1 monsters converted to 5.2.1 (stats are largely the same)
  const monsters51 = entries51.filter((e) => e.type === "monster");
  for (const m of monsters51) {
    entries521.push({
      ...m,
      id: m.id.replace("5.1", "5.2.1"),
      srd_version: "5.2.1",
      source_json: { pdfUrl: dataset521.sourcePdfUrl, pdfSha256: sha521 }
    });
  }

  // Use 5.1 magic items converted to 5.2.1
  const magicItems51 = entries51.filter((e) => e.type === "magic_item");
  for (const mi of magicItems51) {
    entries521.push({
      ...mi,
      id: mi.id.replace("5.1", "5.2.1"),
      srd_version: "5.2.1",
      source_json: { pdfUrl: dataset521.sourcePdfUrl, pdfSha256: sha521 }
    });
  }

  // Use 5.1 equipment converted to 5.2.1
  const equipment51 = entries51.filter((e) => e.type === "equipment");
  for (const eq of equipment51) {
    entries521.push({
      ...eq,
      id: eq.id.replace("5.1", "5.2.1"),
      srd_version: "5.2.1",
      source_json: { pdfUrl: dataset521.sourcePdfUrl, pdfSha256: sha521 }
    });
  }

  // Use PDF-parsed classes, species, backgrounds, conditions, rules
  const pdfOther = pdfResult.entries.filter(
    (e) =>
      e.type === "class" ||
      e.type === "species" ||
      e.type === "background" ||
      e.type === "condition" ||
      e.type === "rule"
  );
  entries521.push(...pdfOther);

  // Use 5.1 subclasses converted to 5.2.1
  const subclasses51 = entries51.filter((e) => e.type === "subclass");
  for (const sc of subclasses51) {
    entries521.push({
      ...sc,
      id: sc.id.replace("5.1", "5.2.1"),
      srd_version: "5.2.1",
      source_json: { pdfUrl: dataset521.sourcePdfUrl, pdfSha256: sha521 }
    });
  }

  // Use 5.1 feats converted to 5.2.1
  const feats51 = entries51.filter((e) => e.type === "feat");
  for (const f of feats51) {
    entries521.push({
      ...f,
      id: f.id.replace("5.1", "5.2.1"),
      srd_version: "5.2.1",
      source_json: { pdfUrl: dataset521.sourcePdfUrl, pdfSha256: sha521 }
    });
  }

  // Use 5.1 glossary terms (traits, features) converted to 5.2.1
  const glossary51 = entries51.filter((e) => e.type === "glossary_term");
  for (const g of glossary51) {
    entries521.push({
      ...g,
      id: g.id.replace("5.1", "5.2.1"),
      srd_version: "5.2.1",
      source_json: { pdfUrl: dataset521.sourcePdfUrl, pdfSha256: sha521 }
    });
  }

  // Deduplicate
  const seen = new Set<string>();
  const deduped = entries521.filter((e) => {
    if (seen.has(e.id)) return false;
    seen.add(e.id);
    return true;
  });

  // Count by type
  const byType: Record<string, number> = {};
  for (const entry of deduped) {
    byType[entry.type] = (byType[entry.type] || 0) + 1;
  }
  console.log(`  Combined ${deduped.length} entries:`);
  for (const [type, count] of Object.entries(byType).sort()) {
    console.log(`    ${type}: ${count}`);
  }

  dataset521.sourcePdfSha256 = sha521;
  dataset521.generatedAt = now;

  const entriesPath521 = path.join(ASSETS_DIR, dataset521.entriesPath);
  fs.mkdirSync(path.dirname(entriesPath521), { recursive: true });
  fs.writeFileSync(entriesPath521, JSON.stringify(deduped, null, 2));
  console.log(`  Wrote to ${dataset521.entriesPath}`);

  // Write updated manifest
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  console.log("\nUpdated manifest.json");
  console.log("\nSRD generation complete!");
}

main().catch((err) => {
  console.error("Generation failed:", err);
  process.exit(1);
});
