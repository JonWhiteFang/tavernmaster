#!/usr/bin/env node
/**
 * Download SRD PDFs and compute SHA256 hashes
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";

const CACHE_DIR = path.resolve(import.meta.dirname, "../../.srd-cache");

export interface DownloadResult {
  path: string;
  sha256: string;
}

export async function downloadPdf(url: string, version: string): Promise<DownloadResult> {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const destPath = path.join(CACHE_DIR, `srd-${version}.pdf`);

  // Check if already cached
  if (fs.existsSync(destPath)) {
    console.log(`  Using cached PDF for ${version}`);
    const buffer = fs.readFileSync(destPath);
    const sha256 = crypto.createHash("sha256").update(buffer).digest("hex");
    return { path: destPath, sha256 };
  }

  console.log(`  Downloading ${url}...`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download: ${response.status} ${response.statusText}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(destPath, buffer);

  const sha256 = crypto.createHash("sha256").update(buffer).digest("hex");
  console.log(
    `  Downloaded (${(buffer.length / 1024 / 1024).toFixed(1)} MB, sha256: ${sha256.slice(0, 12)}...)`
  );

  return { path: destPath, sha256 };
}
