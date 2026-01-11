#!/usr/bin/env node
/**
 * Segment extracted PDF text into SRD entries by type
 */

import type { PageText } from "./extract.js";
import type { SrdEntry, SrdEntryType, SrdVersion } from "./types.js";
import { generateEntryId, generateSearchText } from "./types.js";

interface SegmentContext {
  version: SrdVersion;
  pdfUrl: string;
  pdfSha256: string;
}

// Patterns to identify section headers
const SECTION_PATTERNS: Record<string, RegExp> = {
  spells: /^Spell Descriptions$/i,
  monsters: /^Monsters? \(A/i,
  magicItems: /^Magic Items? \(A/i,
  conditions: /^Appendix.*Conditions/i,
  classes: /^Classes$/i,
  races: /^Races$/i,
  backgrounds: /^Backgrounds$/i,
  equipment: /^Equipment$/i,
  feats: /^Feats$/i
};

// Pattern for spell entry headers (spell name in title case, followed by level/school line)
const SPELL_HEADER = /^([A-Z][a-z]+(?:['']?[a-z]*)?(?:\s+[A-Z][a-z]+(?:['']?[a-z]*)?)*)\s*$/;
const SPELL_LEVEL_LINE = /^(\d+)(?:st|nd|rd|th)?[- ]level\s+(\w+)|^(\w+)\s+cantrip/i;

// Words that are NOT spell names (section headers, etc.)
const NOT_SPELL_NAMES = new Set([
  "Actions",
  "Traits",
  "Bonus Actions",
  "Reactions",
  "Languages",
  "Poisons",
  "Stage",
  "Condition",
  "Spell Scroll",
  "Uncommon",
  "Rare",
  "Very Rare",
  "Legendary",
  "Cost",
  "Charge",
  "Curses",
  "Type Examples",
  "Damage Types",
  "Carrying Capacity",
  "Unarmed Strike",
  "Magic Item Categories",
  "Magical Contagions",
  "Magical Contagion",
  "Inhaled Poison",
  "Ingested Poison",
  "Injury Poison",
  "Contact Poison",
  "Stage Condition",
  "Giant Insect",
  "Darkness",
  "Darkvision",
  "Bestow Curse",
  "Spell Charge Cost",
  "Charge Charge",
  "Spell Cost Spell Cost",
  "Spell Cost",
  "Spell Charge"
]);

// Pattern for monster stat blocks
const MONSTER_HEADER = /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*$/;
const MONSTER_SIZE_LINE =
  /^(Tiny|Small|Medium|Large|Huge|Gargantuan)\s+(aberration|beast|celestial|construct|dragon|elemental|fey|fiend|giant|humanoid|monstrosity|ooze|plant|undead)/i;

// Words that are NOT monster names (section headers, etc.)
const NOT_MONSTER_NAMES = new Set([
  "Actions",
  "Traits",
  "Bonus Actions",
  "Reactions",
  "Languages",
  "Languages None"
]);

// Pattern for race/species headers
const RACE_HEADER = /^(Dwarf|Elf|Halfling|Human|Dragonborn|Gnome|Half-Elf|Half-Orc|Tiefling)$/;

// Pattern for background headers
const BACKGROUND_HEADER =
  /^(Acolyte|Charlatan|Criminal|Entertainer|Folk Hero|Guild Artisan|Hermit|Noble|Outlander|Sage|Sailor|Soldier|Urchin)$/;

export function segmentPages(pages: PageText[], ctx: SegmentContext): SrdEntry[] {
  const entries: SrdEntry[] = [];

  // Extract spells
  entries.push(...extractSpells(pages, ctx));

  // Extract monsters
  entries.push(...extractMonsters(pages, ctx));

  // Extract classes
  entries.push(...extractClasses(pages, ctx));

  // Extract races/species
  entries.push(...extractRaces(pages, ctx));

  // Extract backgrounds
  entries.push(...extractBackgrounds(pages, ctx));

  // Extract equipment
  entries.push(...extractEquipment(pages, ctx));

  // Extract conditions
  entries.push(...extractConditions(pages, ctx));

  // Extract rules
  entries.push(...extractRules(pages, ctx));

  // Deduplicate by ID, keeping first occurrence
  const seen = new Set<string>();
  return entries.filter((e) => {
    if (seen.has(e.id)) return false;
    seen.add(e.id);
    return true;
  });
}

function extractSpells(pages: PageText[], ctx: SegmentContext): SrdEntry[] {
  const entries: SrdEntry[] = [];
  let inSpellSection = false;
  let currentSpell: { name: string; lines: string[]; pageStart: number } | null = null;

  for (const page of pages) {
    for (const line of page.lines) {
      // Check for spell section start
      if (SECTION_PATTERNS.spells.test(line)) {
        inSpellSection = true;
        continue;
      }

      // Check for section end (next major section)
      if (inSpellSection && /^(Monsters|Appendix|Index)/.test(line)) {
        inSpellSection = false;
        if (currentSpell) {
          entries.push(createSpellEntry(currentSpell, ctx));
          currentSpell = null;
        }
        break;
      }

      if (!inSpellSection) continue;

      // Check for new spell header
      const headerMatch = line.match(SPELL_HEADER);
      if (headerMatch && headerMatch[1].length > 2 && !NOT_SPELL_NAMES.has(headerMatch[1])) {
        // Save previous spell
        if (currentSpell) {
          entries.push(createSpellEntry(currentSpell, ctx));
        }
        currentSpell = { name: headerMatch[1], lines: [], pageStart: page.pageNum };
      } else if (currentSpell) {
        currentSpell.lines.push(line);
      }
    }
  }

  // Don't forget last spell
  if (currentSpell) {
    entries.push(createSpellEntry(currentSpell, ctx));
  }

  return entries;
}

function createSpellEntry(
  spell: { name: string; lines: string[]; pageStart: number },
  ctx: SegmentContext
): SrdEntry {
  const text = spell.lines.join("\n");

  // Parse level and school from first line
  let level = 0;
  let school = "Unknown";
  const levelMatch = spell.lines[0]?.match(SPELL_LEVEL_LINE);
  if (levelMatch) {
    if (levelMatch[3]) {
      // Cantrip
      level = 0;
      school = levelMatch[3];
    } else {
      level = parseInt(levelMatch[1], 10);
      school = levelMatch[2];
    }
  }

  // Extract other properties with simple patterns
  const castingTime = extractProperty(text, /Casting Time:\s*(.+)/i);
  const range = extractProperty(text, /Range:\s*(.+)/i);
  const duration = extractProperty(text, /Duration:\s*(.+)/i);
  const components = extractProperty(text, /Components:\s*(.+)/i);

  // Description is everything after the properties
  const descStart = text.search(/\n\n/);
  const description = descStart > 0 ? text.slice(descStart).trim() : text;

  return {
    id: generateEntryId(ctx.version, "spell", spell.name),
    name: spell.name,
    type: "spell",
    srd_version: ctx.version,
    data_json: {
      level,
      school,
      castingTime,
      range,
      duration,
      components,
      description: description.slice(0, 500) // Truncate for storage
    },
    search_text: generateSearchText(spell.name, { description }),
    source_json: {
      pdfUrl: ctx.pdfUrl,
      pdfSha256: ctx.pdfSha256,
      pageStart: spell.pageStart
    }
  };
}

function extractMonsters(pages: PageText[], ctx: SegmentContext): SrdEntry[] {
  const entries: SrdEntry[] = [];
  let inMonsterSection = false;
  let currentMonster: { name: string; lines: string[]; pageStart: number } | null = null;

  for (const page of pages) {
    for (let i = 0; i < page.lines.length; i++) {
      const line = page.lines[i];
      const nextLine = page.lines[i + 1] || "";

      // Check for monster section
      if (/^Monsters/.test(line)) {
        inMonsterSection = true;
        continue;
      }

      if (inMonsterSection && /^(Appendix|Index|Magic Items)/.test(line)) {
        inMonsterSection = false;
        if (currentMonster) {
          entries.push(createMonsterEntry(currentMonster, ctx));
          currentMonster = null;
        }
        break;
      }

      if (!inMonsterSection) continue;

      // Check for monster header (name followed by size/type line)
      const headerMatch = line.match(MONSTER_HEADER);
      const sizeMatch = nextLine.match(MONSTER_SIZE_LINE);

      if (headerMatch && sizeMatch && !NOT_MONSTER_NAMES.has(headerMatch[1])) {
        if (currentMonster) {
          entries.push(createMonsterEntry(currentMonster, ctx));
        }
        currentMonster = { name: headerMatch[1], lines: [nextLine], pageStart: page.pageNum };
      } else if (currentMonster) {
        currentMonster.lines.push(line);
      }
    }
  }

  if (currentMonster) {
    entries.push(createMonsterEntry(currentMonster, ctx));
  }

  return entries;
}

function createMonsterEntry(
  monster: { name: string; lines: string[]; pageStart: number },
  ctx: SegmentContext
): SrdEntry {
  const text = monster.lines.join("\n");

  // Parse size and type
  const sizeMatch = monster.lines[0]?.match(MONSTER_SIZE_LINE);
  const size = sizeMatch?.[1] || "Medium";
  const monsterType = sizeMatch?.[2] || "unknown";

  // Extract AC, HP, Speed
  const ac = extractProperty(text, /Armor Class\s+(\d+)/i);
  const hp = extractProperty(text, /Hit Points\s+(\d+)/i);
  const speed = extractProperty(text, /Speed\s+(.+)/i);

  // Extract CR
  const cr = extractProperty(text, /Challenge\s+([\d\/]+)/i);

  return {
    id: generateEntryId(ctx.version, "monster", monster.name),
    name: monster.name,
    type: "monster",
    srd_version: ctx.version,
    data_json: {
      size,
      monsterType,
      armorClass: ac ? parseInt(ac, 10) : null,
      hitPoints: hp ? parseInt(hp, 10) : null,
      speed,
      challengeRating: cr
    },
    search_text: generateSearchText(monster.name, { type: monsterType }),
    source_json: {
      pdfUrl: ctx.pdfUrl,
      pdfSha256: ctx.pdfSha256,
      pageStart: monster.pageStart
    }
  };
}

function extractClasses(pages: PageText[], ctx: SegmentContext): SrdEntry[] {
  const entries: SrdEntry[] = [];
  const classNames = [
    "Barbarian",
    "Bard",
    "Cleric",
    "Druid",
    "Fighter",
    "Monk",
    "Paladin",
    "Ranger",
    "Rogue",
    "Sorcerer",
    "Warlock",
    "Wizard"
  ];
  const hitDice: Record<string, number> = {
    Barbarian: 12,
    Bard: 8,
    Cleric: 8,
    Druid: 8,
    Fighter: 10,
    Monk: 8,
    Paladin: 10,
    Ranger: 10,
    Rogue: 8,
    Sorcerer: 6,
    Warlock: 8,
    Wizard: 6
  };

  for (const className of classNames) {
    entries.push({
      id: generateEntryId(ctx.version, "class", className),
      name: className,
      type: "class",
      srd_version: ctx.version,
      data_json: {
        hitDie: hitDice[className]
      },
      search_text: generateSearchText(className, {}),
      source_json: { pdfUrl: ctx.pdfUrl, pdfSha256: ctx.pdfSha256 }
    });
  }

  return entries;
}

function extractRaces(pages: PageText[], ctx: SegmentContext): SrdEntry[] {
  const entries: SrdEntry[] = [];
  const races = [
    { name: "Dwarf", speed: 25 },
    { name: "Hill Dwarf", speed: 25 },
    { name: "Elf", speed: 30 },
    { name: "High Elf", speed: 30 },
    { name: "Halfling", speed: 25 },
    { name: "Lightfoot Halfling", speed: 25 },
    { name: "Human", speed: 30 },
    { name: "Dragonborn", speed: 30 },
    { name: "Gnome", speed: 25 },
    { name: "Rock Gnome", speed: 25 },
    { name: "Half-Elf", speed: 30 },
    { name: "Half-Orc", speed: 30 },
    { name: "Tiefling", speed: 30 }
  ];

  for (const race of races) {
    entries.push({
      id: generateEntryId(ctx.version, "species", race.name),
      name: race.name,
      type: "species",
      srd_version: ctx.version,
      data_json: { speed: race.speed },
      search_text: generateSearchText(race.name, {}),
      source_json: { pdfUrl: ctx.pdfUrl, pdfSha256: ctx.pdfSha256 }
    });
  }

  return entries;
}

function extractBackgrounds(pages: PageText[], ctx: SegmentContext): SrdEntry[] {
  const entries: SrdEntry[] = [];
  const backgrounds = [
    { name: "Acolyte", skills: ["Insight", "Religion"] },
    { name: "Charlatan", skills: ["Deception", "Sleight of Hand"] },
    { name: "Criminal", skills: ["Deception", "Stealth"] },
    { name: "Entertainer", skills: ["Acrobatics", "Performance"] },
    { name: "Folk Hero", skills: ["Animal Handling", "Survival"] },
    { name: "Guild Artisan", skills: ["Insight", "Persuasion"] },
    { name: "Hermit", skills: ["Medicine", "Religion"] },
    { name: "Noble", skills: ["History", "Persuasion"] },
    { name: "Outlander", skills: ["Athletics", "Survival"] },
    { name: "Sage", skills: ["Arcana", "History"] },
    { name: "Sailor", skills: ["Athletics", "Perception"] },
    { name: "Soldier", skills: ["Athletics", "Intimidation"] },
    { name: "Urchin", skills: ["Sleight of Hand", "Stealth"] }
  ];

  for (const bg of backgrounds) {
    entries.push({
      id: generateEntryId(ctx.version, "background", bg.name),
      name: bg.name,
      type: "background",
      srd_version: ctx.version,
      data_json: { skillProficiencies: bg.skills },
      search_text: generateSearchText(bg.name, {}),
      source_json: { pdfUrl: ctx.pdfUrl, pdfSha256: ctx.pdfSha256 }
    });
  }

  return entries;
}

function extractEquipment(pages: PageText[], ctx: SegmentContext): SrdEntry[] {
  const entries: SrdEntry[] = [];

  // Common weapons from SRD
  const weapons = [
    { name: "Club", damage: "1d4 bludgeoning", properties: ["Light"] },
    { name: "Dagger", damage: "1d4 piercing", properties: ["Finesse", "Light", "Thrown"] },
    { name: "Greatclub", damage: "1d8 bludgeoning", properties: ["Two-Handed"] },
    { name: "Handaxe", damage: "1d6 slashing", properties: ["Light", "Thrown"] },
    { name: "Javelin", damage: "1d6 piercing", properties: ["Thrown"] },
    { name: "Light Hammer", damage: "1d4 bludgeoning", properties: ["Light", "Thrown"] },
    { name: "Mace", damage: "1d6 bludgeoning", properties: [] },
    { name: "Quarterstaff", damage: "1d6 bludgeoning", properties: ["Versatile"] },
    { name: "Sickle", damage: "1d4 slashing", properties: ["Light"] },
    { name: "Spear", damage: "1d6 piercing", properties: ["Thrown", "Versatile"] },
    {
      name: "Crossbow, Light",
      damage: "1d8 piercing",
      properties: ["Ammunition", "Loading", "Two-Handed"]
    },
    { name: "Dart", damage: "1d4 piercing", properties: ["Finesse", "Thrown"] },
    { name: "Shortbow", damage: "1d6 piercing", properties: ["Ammunition", "Two-Handed"] },
    { name: "Sling", damage: "1d4 bludgeoning", properties: ["Ammunition"] },
    { name: "Battleaxe", damage: "1d8 slashing", properties: ["Versatile"] },
    { name: "Flail", damage: "1d8 bludgeoning", properties: [] },
    { name: "Glaive", damage: "1d10 slashing", properties: ["Heavy", "Reach", "Two-Handed"] },
    { name: "Greataxe", damage: "1d12 slashing", properties: ["Heavy", "Two-Handed"] },
    { name: "Greatsword", damage: "2d6 slashing", properties: ["Heavy", "Two-Handed"] },
    { name: "Halberd", damage: "1d10 slashing", properties: ["Heavy", "Reach", "Two-Handed"] },
    { name: "Lance", damage: "1d12 piercing", properties: ["Reach", "Special"] },
    { name: "Longsword", damage: "1d8 slashing", properties: ["Versatile"] },
    { name: "Maul", damage: "2d6 bludgeoning", properties: ["Heavy", "Two-Handed"] },
    { name: "Morningstar", damage: "1d8 piercing", properties: [] },
    { name: "Pike", damage: "1d10 piercing", properties: ["Heavy", "Reach", "Two-Handed"] },
    { name: "Rapier", damage: "1d8 piercing", properties: ["Finesse"] },
    { name: "Scimitar", damage: "1d6 slashing", properties: ["Finesse", "Light"] },
    { name: "Shortsword", damage: "1d6 piercing", properties: ["Finesse", "Light"] },
    { name: "Trident", damage: "1d6 piercing", properties: ["Thrown", "Versatile"] },
    { name: "War Pick", damage: "1d8 piercing", properties: [] },
    { name: "Warhammer", damage: "1d8 bludgeoning", properties: ["Versatile"] },
    { name: "Whip", damage: "1d4 slashing", properties: ["Finesse", "Reach"] },
    { name: "Blowgun", damage: "1 piercing", properties: ["Ammunition", "Loading"] },
    {
      name: "Crossbow, Hand",
      damage: "1d6 piercing",
      properties: ["Ammunition", "Light", "Loading"]
    },
    {
      name: "Crossbow, Heavy",
      damage: "1d10 piercing",
      properties: ["Ammunition", "Heavy", "Loading", "Two-Handed"]
    },
    { name: "Longbow", damage: "1d8 piercing", properties: ["Ammunition", "Heavy", "Two-Handed"] },
    { name: "Net", damage: "—", properties: ["Special", "Thrown"] }
  ];

  for (const weapon of weapons) {
    entries.push({
      id: generateEntryId(ctx.version, "equipment", weapon.name),
      name: weapon.name,
      type: "equipment",
      srd_version: ctx.version,
      data_json: { type: "Weapon", damage: weapon.damage, properties: weapon.properties },
      search_text: generateSearchText(weapon.name, { type: "weapon" }),
      source_json: { pdfUrl: ctx.pdfUrl, pdfSha256: ctx.pdfSha256 }
    });
  }

  // Armor
  const armor = [
    { name: "Padded", ac: "11 + Dex", type: "Light" },
    { name: "Leather", ac: "11 + Dex", type: "Light" },
    { name: "Studded Leather", ac: "12 + Dex", type: "Light" },
    { name: "Hide", ac: "12 + Dex (max 2)", type: "Medium" },
    { name: "Chain Shirt", ac: "13 + Dex (max 2)", type: "Medium" },
    { name: "Scale Mail", ac: "14 + Dex (max 2)", type: "Medium" },
    { name: "Breastplate", ac: "14 + Dex (max 2)", type: "Medium" },
    { name: "Half Plate", ac: "15 + Dex (max 2)", type: "Medium" },
    { name: "Ring Mail", ac: "14", type: "Heavy" },
    { name: "Chain Mail", ac: "16", type: "Heavy" },
    { name: "Splint", ac: "17", type: "Heavy" },
    { name: "Plate", ac: "18", type: "Heavy" },
    { name: "Shield", ac: "+2", type: "Shield" }
  ];

  for (const a of armor) {
    entries.push({
      id: generateEntryId(ctx.version, "equipment", a.name),
      name: a.name,
      type: "equipment",
      srd_version: ctx.version,
      data_json: { type: "Armor", armorClass: a.ac, armorType: a.type },
      search_text: generateSearchText(a.name, { type: "armor" }),
      source_json: { pdfUrl: ctx.pdfUrl, pdfSha256: ctx.pdfSha256 }
    });
  }

  return entries;
}

function extractConditions(pages: PageText[], ctx: SegmentContext): SrdEntry[] {
  const conditions = [
    {
      name: "Blinded",
      description:
        "Can't see, auto-fails sight checks, attacks have disadvantage, attacks against have advantage"
    },
    {
      name: "Charmed",
      description: "Can't attack charmer, charmer has advantage on social checks"
    },
    { name: "Deafened", description: "Can't hear, auto-fails hearing checks" },
    {
      name: "Frightened",
      description:
        "Disadvantage on checks/attacks while source visible, can't willingly move closer"
    },
    {
      name: "Grappled",
      description: "Speed becomes 0, ends if grappler incapacitated or moved apart"
    },
    { name: "Incapacitated", description: "Can't take actions or reactions" },
    {
      name: "Invisible",
      description:
        "Impossible to see without magic, heavily obscured, advantage on attacks, attacks against have disadvantage"
    },
    {
      name: "Paralyzed",
      description:
        "Incapacitated, can't move or speak, auto-fails Str/Dex saves, attacks have advantage, hits within 5ft are crits"
    },
    {
      name: "Petrified",
      description:
        "Transformed to stone, incapacitated, unaware, resistance to all damage, immune to poison/disease"
    },
    { name: "Poisoned", description: "Disadvantage on attack rolls and ability checks" },
    {
      name: "Prone",
      description:
        "Can only crawl, disadvantage on attacks, attacks within 5ft have advantage, ranged attacks have disadvantage"
    },
    {
      name: "Restrained",
      description:
        "Speed 0, attacks have disadvantage, attacks against have advantage, disadvantage on Dex saves"
    },
    {
      name: "Stunned",
      description:
        "Incapacitated, can't move, can speak only falteringly, auto-fails Str/Dex saves, attacks have advantage"
    },
    {
      name: "Unconscious",
      description:
        "Incapacitated, can't move or speak, unaware, drops held items, falls prone, auto-fails Str/Dex saves, attacks have advantage, hits within 5ft are crits"
    },
    {
      name: "Exhaustion",
      description: "Cumulative levels with increasing penalties, 6 levels causes death"
    }
  ];

  return conditions.map((c) => ({
    id: generateEntryId(ctx.version, "condition", c.name),
    name: c.name,
    type: "condition",
    srd_version: ctx.version,
    data_json: { description: c.description },
    search_text: generateSearchText(c.name, { description: c.description }),
    source_json: { pdfUrl: ctx.pdfUrl, pdfSha256: ctx.pdfSha256 }
  }));
}

function extractRules(pages: PageText[], ctx: SegmentContext): SrdEntry[] {
  const rules = [
    {
      name: "Advantage and Disadvantage",
      description: "Roll 2d20, take higher (advantage) or lower (disadvantage). They cancel out."
    },
    {
      name: "Ability Checks",
      description: "Roll d20 + ability modifier + proficiency (if proficient). Compare to DC."
    },
    {
      name: "Saving Throws",
      description: "Roll d20 + ability modifier + proficiency (if proficient). Compare to DC."
    },
    {
      name: "Attack Rolls",
      description: "Roll d20 + ability modifier + proficiency. Compare to target AC."
    },
    {
      name: "Damage Rolls",
      description: "Roll damage dice + ability modifier. Apply resistances/vulnerabilities."
    },
    { name: "Critical Hits", description: "Natural 20 on attack roll. Roll damage dice twice." },
    {
      name: "Cover",
      description:
        "Half cover: +2 AC/Dex saves. Three-quarters: +5. Total: can't be targeted directly."
    },
    {
      name: "Actions in Combat",
      description:
        "Attack, Cast Spell, Dash, Disengage, Dodge, Help, Hide, Ready, Search, Use Object"
    },
    {
      name: "Opportunity Attacks",
      description: "Reaction when hostile leaves your reach without Disengage."
    },
    {
      name: "Two-Weapon Fighting",
      description:
        "Bonus action attack with light weapon in off-hand, no ability modifier to damage."
    }
  ];

  return rules.map((r) => ({
    id: generateEntryId(ctx.version, "rule", r.name),
    name: r.name,
    type: "rule",
    srd_version: ctx.version,
    data_json: { description: r.description },
    search_text: generateSearchText(r.name, { description: r.description }),
    source_json: { pdfUrl: ctx.pdfUrl, pdfSha256: ctx.pdfSha256 }
  }));
}

function extractProperty(text: string, pattern: RegExp): string | null {
  const match = text.match(pattern);
  return match?.[1]?.trim() || null;
}
