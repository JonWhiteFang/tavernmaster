#!/usr/bin/env node
/**
 * Fetch and convert 5e-bits/5e-database JSON to our SRD entry format.
 * This provides production-quality structured data for SRD 5.1.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { SrdEntry, SrdVersion } from "./types.js";
import { generateEntryId, generateSearchText } from "./types.js";

const BASE_URL = "https://raw.githubusercontent.com/5e-bits/5e-database/main/src/2014";
const CACHE_DIR = path.resolve(import.meta.dirname, "../../.srd-cache/5e-bits");

interface SourceInfo {
  pdfUrl: string;
  pdfSha256: string;
}

async function fetchJson<T>(filename: string): Promise<T> {
  const cachePath = path.join(CACHE_DIR, filename);

  // Check cache first
  if (fs.existsSync(cachePath)) {
    return JSON.parse(fs.readFileSync(cachePath, "utf-8"));
  }

  // Fetch from GitHub
  const url = `${BASE_URL}/${filename}`;
  console.log(`  Fetching ${filename}...`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);

  const data = await res.json();

  // Cache it
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(cachePath, JSON.stringify(data, null, 2));

  return data as T;
}

// Type definitions for 5e-bits data
interface ApiReference {
  index: string;
  name: string;
  url: string;
}

interface Spell5e {
  index: string;
  name: string;
  level: number;
  school: ApiReference;
  casting_time: string;
  range: string;
  duration: string;
  components: string[];
  material?: string;
  concentration: boolean;
  ritual: boolean;
  desc: string[];
  higher_level?: string[];
  classes: ApiReference[];
}

interface Monster5e {
  index: string;
  name: string;
  size: string;
  type: string;
  subtype?: string;
  alignment: string;
  armor_class: Array<{ type: string; value: number }>;
  hit_points: number;
  hit_dice: string;
  speed: Record<string, string>;
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
  proficiencies: Array<{ value: number; proficiency: ApiReference }>;
  damage_vulnerabilities: string[];
  damage_resistances: string[];
  damage_immunities: string[];
  condition_immunities: ApiReference[];
  senses: Record<string, string>;
  languages: string;
  challenge_rating: number;
  xp: number;
  special_abilities?: Array<{ name: string; desc: string }>;
  actions?: Array<{ name: string; desc: string; attack_bonus?: number; damage?: unknown[] }>;
  legendary_actions?: Array<{ name: string; desc: string }>;
}

interface MagicItem5e {
  index: string;
  name: string;
  rarity: ApiReference;
  variant: boolean;
  desc: string[];
  equipment_category: ApiReference;
}

interface Equipment5e {
  index: string;
  name: string;
  equipment_category: ApiReference;
  cost?: { quantity: number; unit: string };
  weight?: number;
  desc?: string[];
  weapon_category?: string;
  weapon_range?: string;
  damage?: { damage_dice: string; damage_type: ApiReference };
  properties?: ApiReference[];
  armor_category?: string;
  armor_class?: { base: number; dex_bonus: boolean; max_bonus?: number };
  str_minimum?: number;
  stealth_disadvantage?: boolean;
}

interface Class5e {
  index: string;
  name: string;
  hit_die: number;
  proficiency_choices: unknown[];
  proficiencies: ApiReference[];
  saving_throws: ApiReference[];
  starting_equipment: unknown[];
  class_levels: string;
  subclasses: ApiReference[];
  spellcasting?: unknown;
}

interface Subclass5e {
  index: string;
  name: string;
  class: ApiReference;
  subclass_flavor: string;
  desc: string[];
  subclass_levels: string;
}

interface Race5e {
  index: string;
  name: string;
  speed: number;
  ability_bonuses: Array<{ ability_score: ApiReference; bonus: number }>;
  size: string;
  size_description: string;
  languages: ApiReference[];
  language_desc: string;
  traits: ApiReference[];
  subraces: ApiReference[];
}

interface Subrace5e {
  index: string;
  name: string;
  race: ApiReference;
  desc: string;
  ability_bonuses: Array<{ ability_score: ApiReference; bonus: number }>;
  racial_traits: ApiReference[];
}

interface Background5e {
  index: string;
  name: string;
  starting_proficiencies: ApiReference[];
  starting_equipment: unknown[];
  feature: { name: string; desc: string[] };
}

interface Condition5e {
  index: string;
  name: string;
  desc: string[];
}

interface Feat5e {
  index: string;
  name: string;
  prerequisites: unknown[];
  desc: string[];
}

interface Rule5e {
  index: string;
  name: string;
  desc: string;
  subsections: ApiReference[];
}

interface Trait5e {
  index: string;
  name: string;
  races: ApiReference[];
  desc: string[];
}

interface Feature5e {
  index: string;
  name: string;
  class: ApiReference;
  subclass?: ApiReference;
  level: number;
  desc: string[];
  prerequisites?: unknown[];
}

function convertSpells(spells: Spell5e[], version: SrdVersion, source: SourceInfo): SrdEntry[] {
  return spells.map((s) => ({
    id: generateEntryId(version, "spell", s.name),
    name: s.name,
    type: "spell" as const,
    srd_version: version,
    data_json: {
      level: s.level,
      school: s.school.name,
      castingTime: s.casting_time,
      range: s.range,
      duration: s.duration,
      components: s.components,
      material: s.material,
      concentration: s.concentration,
      ritual: s.ritual,
      description: s.desc.join("\n\n"),
      higherLevel: s.higher_level?.join("\n\n"),
      classes: s.classes.map((c) => c.name)
    },
    search_text: generateSearchText(s.name, {
      description: s.desc.join(" "),
      school: s.school.name
    }),
    source_json: source
  }));
}

function convertMonsters(
  monsters: Monster5e[],
  version: SrdVersion,
  source: SourceInfo
): SrdEntry[] {
  return monsters.map((m) => ({
    id: generateEntryId(version, "monster", m.name),
    name: m.name,
    type: "monster" as const,
    srd_version: version,
    data_json: {
      size: m.size,
      monsterType: m.type,
      subtype: m.subtype,
      alignment: m.alignment,
      armorClass: m.armor_class[0]?.value,
      hitPoints: m.hit_points,
      hitDice: m.hit_dice,
      speed: m.speed,
      abilities: {
        strength: m.strength,
        dexterity: m.dexterity,
        constitution: m.constitution,
        intelligence: m.intelligence,
        wisdom: m.wisdom,
        charisma: m.charisma
      },
      savingThrows: m.proficiencies
        .filter((p) => p.proficiency.index.startsWith("saving-throw-"))
        .map((p) => ({ name: p.proficiency.name, bonus: p.value })),
      skills: m.proficiencies
        .filter((p) => p.proficiency.index.startsWith("skill-"))
        .map((p) => ({ name: p.proficiency.name.replace("Skill: ", ""), bonus: p.value })),
      damageVulnerabilities: m.damage_vulnerabilities,
      damageResistances: m.damage_resistances,
      damageImmunities: m.damage_immunities,
      conditionImmunities: m.condition_immunities.map((c) => c.name),
      senses: m.senses,
      languages: m.languages,
      challengeRating: m.challenge_rating,
      xp: m.xp,
      specialAbilities: m.special_abilities?.map((a) => ({ name: a.name, description: a.desc })),
      actions: m.actions?.map((a) => ({
        name: a.name,
        description: a.desc,
        attackBonus: a.attack_bonus
      })),
      legendaryActions: m.legendary_actions?.map((a) => ({ name: a.name, description: a.desc }))
    },
    search_text: generateSearchText(m.name, {
      type: m.type,
      description: m.special_abilities?.map((a) => a.desc).join(" ")
    }),
    source_json: source
  }));
}

function convertMagicItems(
  items: MagicItem5e[],
  version: SrdVersion,
  source: SourceInfo
): SrdEntry[] {
  return items
    .filter((i) => !i.variant) // Skip variants, keep base items
    .map((i) => ({
      id: generateEntryId(version, "magic_item", i.name),
      name: i.name,
      type: "magic_item" as const,
      srd_version: version,
      data_json: {
        rarity: i.rarity.name,
        description: i.desc.join("\n\n"),
        category: i.equipment_category.name
      },
      search_text: generateSearchText(i.name, {
        description: i.desc.join(" "),
        rarity: i.rarity.name
      }),
      source_json: source
    }));
}

function convertEquipment(
  equipment: Equipment5e[],
  version: SrdVersion,
  source: SourceInfo
): SrdEntry[] {
  return equipment.map((e) => ({
    id: generateEntryId(version, "equipment", e.name),
    name: e.name,
    type: "equipment" as const,
    srd_version: version,
    data_json: {
      category: e.equipment_category.name,
      cost: e.cost ? `${e.cost.quantity} ${e.cost.unit}` : undefined,
      weight: e.weight,
      description: e.desc?.join("\n\n"),
      // Weapon properties
      weaponCategory: e.weapon_category,
      weaponRange: e.weapon_range,
      damage: e.damage ? `${e.damage.damage_dice} ${e.damage.damage_type.name}` : undefined,
      properties: e.properties?.map((p) => p.name),
      // Armor properties
      armorCategory: e.armor_category,
      armorClass: e.armor_class
        ? `${e.armor_class.base}${e.armor_class.dex_bonus ? " + Dex" : ""}${e.armor_class.max_bonus ? ` (max ${e.armor_class.max_bonus})` : ""}`
        : undefined,
      strMinimum: e.str_minimum,
      stealthDisadvantage: e.stealth_disadvantage
    },
    search_text: generateSearchText(e.name, { category: e.equipment_category.name }),
    source_json: source
  }));
}

function convertClasses(classes: Class5e[], version: SrdVersion, source: SourceInfo): SrdEntry[] {
  return classes.map((c) => ({
    id: generateEntryId(version, "class", c.name),
    name: c.name,
    type: "class" as const,
    srd_version: version,
    data_json: {
      hitDie: c.hit_die,
      savingThrows: c.saving_throws.map((s) => s.name),
      proficiencies: c.proficiencies.map((p) => p.name),
      subclasses: c.subclasses.map((s) => s.name),
      hasSpellcasting: !!c.spellcasting
    },
    search_text: generateSearchText(c.name, {}),
    source_json: source
  }));
}

function convertSubclasses(
  subclasses: Subclass5e[],
  version: SrdVersion,
  source: SourceInfo
): SrdEntry[] {
  return subclasses.map((s) => ({
    id: generateEntryId(version, "subclass", s.name),
    name: s.name,
    type: "subclass" as const,
    srd_version: version,
    data_json: {
      class: s.class.name,
      flavor: s.subclass_flavor,
      description: s.desc.join("\n\n")
    },
    search_text: generateSearchText(s.name, { description: s.desc.join(" "), class: s.class.name }),
    source_json: source
  }));
}

function convertRaces(
  races: Race5e[],
  subraces: Subrace5e[],
  version: SrdVersion,
  source: SourceInfo
): SrdEntry[] {
  const entries: SrdEntry[] = [];

  for (const r of races) {
    entries.push({
      id: generateEntryId(version, "species", r.name),
      name: r.name,
      type: "species" as const,
      srd_version: version,
      data_json: {
        speed: r.speed,
        size: r.size,
        abilityBonuses: r.ability_bonuses.map((b) => ({
          ability: b.ability_score.name,
          bonus: b.bonus
        })),
        languages: r.languages.map((l) => l.name),
        traits: r.traits.map((t) => t.name),
        subraces: r.subraces.map((s) => s.name)
      },
      search_text: generateSearchText(r.name, { size: r.size }),
      source_json: source
    });
  }

  for (const s of subraces) {
    entries.push({
      id: generateEntryId(version, "species", s.name),
      name: s.name,
      type: "species" as const,
      srd_version: version,
      data_json: {
        parentRace: s.race.name,
        description: s.desc,
        abilityBonuses: s.ability_bonuses.map((b) => ({
          ability: b.ability_score.name,
          bonus: b.bonus
        })),
        traits: s.racial_traits.map((t) => t.name)
      },
      search_text: generateSearchText(s.name, { parent: s.race.name }),
      source_json: source
    });
  }

  return entries;
}

function convertBackgrounds(
  backgrounds: Background5e[],
  version: SrdVersion,
  source: SourceInfo
): SrdEntry[] {
  return backgrounds.map((b) => ({
    id: generateEntryId(version, "background", b.name),
    name: b.name,
    type: "background" as const,
    srd_version: version,
    data_json: {
      proficiencies: b.starting_proficiencies.map((p) => p.name),
      feature: {
        name: b.feature.name,
        description: b.feature.desc.join("\n\n")
      }
    },
    search_text: generateSearchText(b.name, { feature: b.feature.name }),
    source_json: source
  }));
}

function convertConditions(
  conditions: Condition5e[],
  version: SrdVersion,
  source: SourceInfo
): SrdEntry[] {
  return conditions.map((c) => ({
    id: generateEntryId(version, "condition", c.name),
    name: c.name,
    type: "condition" as const,
    srd_version: version,
    data_json: {
      description: c.desc.join("\n\n")
    },
    search_text: generateSearchText(c.name, { description: c.desc.join(" ") }),
    source_json: source
  }));
}

function convertFeats(feats: Feat5e[], version: SrdVersion, source: SourceInfo): SrdEntry[] {
  return feats.map((f) => ({
    id: generateEntryId(version, "feat", f.name),
    name: f.name,
    type: "feat" as const,
    srd_version: version,
    data_json: {
      description: f.desc.join("\n\n"),
      prerequisites: f.prerequisites
    },
    search_text: generateSearchText(f.name, { description: f.desc.join(" ") }),
    source_json: source
  }));
}

function convertRules(rules: Rule5e[], version: SrdVersion, source: SourceInfo): SrdEntry[] {
  return rules.map((r) => ({
    id: generateEntryId(version, "rule", r.name),
    name: r.name,
    type: "rule" as const,
    srd_version: version,
    data_json: {
      description: r.desc,
      subsections: r.subsections.map((s) => s.name)
    },
    search_text: generateSearchText(r.name, { description: r.desc }),
    source_json: source
  }));
}

function convertTraits(traits: Trait5e[], version: SrdVersion, source: SourceInfo): SrdEntry[] {
  return traits.map((t) => ({
    id: generateEntryId(version, "glossary_term", t.name),
    name: t.name,
    type: "glossary_term" as const,
    srd_version: version,
    data_json: {
      description: t.desc.join("\n\n"),
      races: t.races.map((r) => r.name),
      category: "Racial Trait"
    },
    search_text: generateSearchText(t.name, { description: t.desc.join(" ") }),
    source_json: source
  }));
}

function convertFeatures(
  features: Feature5e[],
  version: SrdVersion,
  source: SourceInfo
): SrdEntry[] {
  return features.map((f) => ({
    id: generateEntryId(version, "glossary_term", `${f.class.name}-${f.name}-${f.level}`),
    name: f.name,
    type: "glossary_term" as const,
    srd_version: version,
    data_json: {
      description: f.desc.join("\n\n"),
      class: f.class.name,
      subclass: f.subclass?.name,
      level: f.level,
      category: "Class Feature"
    },
    search_text: generateSearchText(f.name, { description: f.desc.join(" "), class: f.class.name }),
    source_json: source
  }));
}

export async function fetch5eDatabase(
  version: SrdVersion,
  source: SourceInfo
): Promise<SrdEntry[]> {
  console.log(`\nFetching 5e-bits/5e-database for SRD ${version}...`);

  const entries: SrdEntry[] = [];

  // Fetch all data files
  const [
    spells,
    monsters,
    magicItems,
    equipment,
    classes,
    subclasses,
    races,
    subraces,
    backgrounds,
    conditions,
    feats,
    rules,
    traits,
    features
  ] = await Promise.all([
    fetchJson<Spell5e[]>("5e-SRD-Spells.json"),
    fetchJson<Monster5e[]>("5e-SRD-Monsters.json"),
    fetchJson<MagicItem5e[]>("5e-SRD-Magic-Items.json"),
    fetchJson<Equipment5e[]>("5e-SRD-Equipment.json"),
    fetchJson<Class5e[]>("5e-SRD-Classes.json"),
    fetchJson<Subclass5e[]>("5e-SRD-Subclasses.json"),
    fetchJson<Race5e[]>("5e-SRD-Races.json"),
    fetchJson<Subrace5e[]>("5e-SRD-Subraces.json"),
    fetchJson<Background5e[]>("5e-SRD-Backgrounds.json"),
    fetchJson<Condition5e[]>("5e-SRD-Conditions.json"),
    fetchJson<Feat5e[]>("5e-SRD-Feats.json"),
    fetchJson<Rule5e[]>("5e-SRD-Rules.json"),
    fetchJson<Trait5e[]>("5e-SRD-Traits.json"),
    fetchJson<Feature5e[]>("5e-SRD-Features.json")
  ]);

  // Convert all data
  entries.push(...convertSpells(spells, version, source));
  entries.push(...convertMonsters(monsters, version, source));
  entries.push(...convertMagicItems(magicItems, version, source));
  entries.push(...convertEquipment(equipment, version, source));
  entries.push(...convertClasses(classes, version, source));
  entries.push(...convertSubclasses(subclasses, version, source));
  entries.push(...convertRaces(races, subraces, version, source));
  entries.push(...convertBackgrounds(backgrounds, version, source));
  entries.push(...convertConditions(conditions, version, source));
  entries.push(...convertFeats(feats, version, source));
  entries.push(...convertRules(rules, version, source));
  entries.push(...convertTraits(traits, version, source));
  entries.push(...convertFeatures(features, version, source));

  // Count by type
  const byType: Record<string, number> = {};
  for (const entry of entries) {
    byType[entry.type] = (byType[entry.type] || 0) + 1;
  }
  console.log(`  Converted ${entries.length} entries:`);
  for (const [type, count] of Object.entries(byType).sort()) {
    console.log(`    ${type}: ${count}`);
  }

  return entries;
}
