import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface SrdEntry {
  id: string;
  name: string;
  type: string;
  srd_version: string;
  data_json: Record<string, unknown>;
  search_text?: string;
  source_json?: Record<string, unknown>;
}

interface Manifest {
  datasets: Array<{
    version: string;
    entriesPath: string;
    sourcePdfUrl: string;
    sourcePdfSha256: string;
    generatedAt: string;
  }>;
}

const ASSETS_DIR = path.resolve(__dirname, "../../assets/srd");

function loadManifest(): Manifest {
  return JSON.parse(fs.readFileSync(path.join(ASSETS_DIR, "manifest.json"), "utf-8"));
}

function loadEntries(entriesPath: string): SrdEntry[] {
  return JSON.parse(fs.readFileSync(path.join(ASSETS_DIR, entriesPath), "utf-8"));
}

describe("SRD data validation", () => {
  const manifest = loadManifest();

  it("manifest has required datasets", () => {
    expect(manifest.datasets.length).toBeGreaterThanOrEqual(2);
    const versions = manifest.datasets.map((d) => d.version);
    expect(versions).toContain("5.1");
    expect(versions).toContain("5.2.1");
  });

  describe.each(manifest.datasets)("SRD $version", ({ version, entriesPath }) => {
    const entries = loadEntries(entriesPath);

    it("has no duplicate IDs", () => {
      const ids = entries.map((e) => e.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it("all entries have required fields", () => {
      for (const entry of entries) {
        expect(entry.id).toBeTruthy();
        expect(entry.name).toBeTruthy();
        expect(entry.type).toBeTruthy();
        expect(entry.srd_version).toBe(version);
        expect(entry.data_json).toBeDefined();
      }
    });

    it("IDs follow expected format", () => {
      for (const entry of entries) {
        expect(entry.id).toMatch(/^srd:\d+\.\d+(\.\d+)?:[a-z_]+:[a-z0-9-]+$/);
      }
    });

    it("has minimum spell count", () => {
      const spells = entries.filter((e) => e.type === "spell");
      expect(spells.length).toBeGreaterThanOrEqual(300);
    });

    it("has minimum monster count", () => {
      const monsters = entries.filter((e) => e.type === "monster");
      expect(monsters.length).toBeGreaterThanOrEqual(300);
    });

    it("has minimum equipment count", () => {
      const equipment = entries.filter((e) => e.type === "equipment");
      expect(equipment.length).toBeGreaterThanOrEqual(200);
    });

    it("has all 12 base classes", () => {
      const classes = entries.filter((e) => e.type === "class");
      expect(classes.length).toBe(12);
      const classNames = classes.map((c) => c.name.toLowerCase());
      expect(classNames).toContain("fighter");
      expect(classNames).toContain("wizard");
      expect(classNames).toContain("cleric");
      expect(classNames).toContain("rogue");
    });

    it("has core species", () => {
      const species = entries.filter((e) => e.type === "species");
      expect(species.length).toBeGreaterThanOrEqual(9);
      const names = species.map((s) => s.name.toLowerCase());
      expect(names).toContain("human");
      expect(names).toContain("elf");
      expect(names).toContain("dwarf");
    });

    it("has conditions", () => {
      const conditions = entries.filter((e) => e.type === "condition");
      expect(conditions.length).toBeGreaterThanOrEqual(10);
      const names = conditions.map((c) => c.name.toLowerCase());
      expect(names).toContain("blinded");
      expect(names).toContain("stunned");
      expect(names).toContain("poisoned");
    });

    it("known class entries exist", () => {
      const ids = new Set(entries.map((e) => e.id));
      expect(ids.has(`srd:${version}:class:fighter`)).toBe(true);
      expect(ids.has(`srd:${version}:class:wizard`)).toBe(true);
      expect(ids.has(`srd:${version}:species:human`)).toBe(true);
    });
  });

  // Version-specific tests for 5.1 (structured data from 5e-database)
  describe("SRD 5.1 structured data", () => {
    const entries = loadEntries("5.1/entries.json");

    it("spells have required data fields", () => {
      const spells = entries.filter((e) => e.type === "spell");
      for (const spell of spells.slice(0, 50)) {
        const data = spell.data_json;
        expect(data.level).toBeDefined();
        expect(data.school).toBeTruthy();
        expect(data.castingTime).toBeTruthy();
        expect(data.description).toBeTruthy();
      }
    });

    it("monsters have required data fields", () => {
      const monsters = entries.filter((e) => e.type === "monster");
      for (const monster of monsters.slice(0, 50)) {
        const data = monster.data_json;
        expect(data.size).toBeTruthy();
        expect(data.monsterType || data.type).toBeTruthy();
        expect(data.armorClass || data.armor_class).toBeDefined();
        expect(data.hitPoints || data.hit_points).toBeDefined();
      }
    });

    it("fireball spell exists with correct data", () => {
      const fireball = entries.find((e) => e.id === "srd:5.1:spell:fireball");
      expect(fireball).toBeDefined();
      expect(fireball?.data_json.level).toBe(3);
      expect(fireball?.data_json.school).toBe("Evocation");
    });

    it("adult red dragon exists with correct data", () => {
      const dragon = entries.find((e) => e.id === "srd:5.1:monster:adult-red-dragon");
      expect(dragon).toBeDefined();
      expect(dragon?.data_json.challengeRating).toBe(17);
    });
  });
});
