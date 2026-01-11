/**
 * SRD Entry type definitions for the generator
 */

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
  source_json?: {
    pdfUrl: string;
    pdfSha256: string;
    pageStart?: number;
    pageEnd?: number;
    section?: string;
  };
}

export interface ManifestDataset {
  version: SrdVersion;
  sourcePdfUrl: string;
  sourcePdfSha256: string;
  generatedAt: string;
  entriesPath: string;
}

export interface Manifest {
  datasets: ManifestDataset[];
}

/**
 * Generate a deterministic ID for an SRD entry
 */
export function generateEntryId(version: SrdVersion, type: SrdEntryType, name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `srd:${version}:${type}:${slug}`;
}

/**
 * Generate search text from entry data
 */
export function generateSearchText(name: string, data: Record<string, unknown>): string {
  const parts = [name];
  if (typeof data.description === "string") {
    parts.push(data.description);
  }
  if (typeof data.text === "string") {
    parts.push(data.text);
  }
  return parts.join(" ").toLowerCase();
}
