import type { AbilityScore } from "../data/types";

type BonusChoices = {
  count: number;
  value: number;
  options: AbilityScore[];
};

export type SrdAncestry = {
  name: string;
  speed: number;
  bonuses: Partial<Record<AbilityScore, number>>;
  bonusChoices?: BonusChoices;
};

export type SrdClass = {
  name: string;
  hitDie: number;
};

export const srdAncestries: SrdAncestry[] = [
  {
    name: "Hill Dwarf",
    speed: 25,
    bonuses: { con: 2, wis: 1 }
  },
  {
    name: "Mountain Dwarf",
    speed: 25,
    bonuses: { con: 2, str: 2 }
  },
  {
    name: "High Elf",
    speed: 30,
    bonuses: { dex: 2, int: 1 }
  },
  {
    name: "Wood Elf",
    speed: 35,
    bonuses: { dex: 2, wis: 1 }
  },
  {
    name: "Lightfoot Halfling",
    speed: 25,
    bonuses: { dex: 2, cha: 1 }
  },
  {
    name: "Stout Halfling",
    speed: 25,
    bonuses: { dex: 2, con: 1 }
  },
  {
    name: "Human",
    speed: 30,
    bonuses: { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 }
  },
  {
    name: "Dragonborn",
    speed: 30,
    bonuses: { str: 2, cha: 1 }
  },
  {
    name: "Forest Gnome",
    speed: 25,
    bonuses: { int: 2, dex: 1 }
  },
  {
    name: "Rock Gnome",
    speed: 25,
    bonuses: { int: 2, con: 1 }
  },
  {
    name: "Half-Elf",
    speed: 30,
    bonuses: { cha: 2 },
    bonusChoices: {
      count: 2,
      value: 1,
      options: ["str", "dex", "con", "int", "wis"]
    }
  },
  {
    name: "Half-Orc",
    speed: 30,
    bonuses: { str: 2, con: 1 }
  },
  {
    name: "Tiefling",
    speed: 30,
    bonuses: { cha: 2, int: 1 }
  }
];

export const srdClasses: SrdClass[] = [
  { name: "Barbarian", hitDie: 12 },
  { name: "Bard", hitDie: 8 },
  { name: "Cleric", hitDie: 8 },
  { name: "Druid", hitDie: 8 },
  { name: "Fighter", hitDie: 10 },
  { name: "Monk", hitDie: 8 },
  { name: "Paladin", hitDie: 10 },
  { name: "Ranger", hitDie: 10 },
  { name: "Rogue", hitDie: 8 },
  { name: "Sorcerer", hitDie: 6 },
  { name: "Warlock", hitDie: 8 },
  { name: "Wizard", hitDie: 6 }
];

export const srdBackgrounds = [
  "Acolyte",
  "Charlatan",
  "Criminal",
  "Entertainer",
  "Folk Hero",
  "Guild Artisan",
  "Hermit",
  "Noble",
  "Outlander",
  "Sage",
  "Sailor",
  "Soldier",
  "Urchin"
];

export const srdAlignments = [
  "Lawful Good",
  "Neutral Good",
  "Chaotic Good",
  "Lawful Neutral",
  "Neutral",
  "Chaotic Neutral",
  "Lawful Evil",
  "Neutral Evil",
  "Chaotic Evil"
];

const pointBuyCosts: Record<number, number> = {
  8: 0,
  9: 1,
  10: 2,
  11: 3,
  12: 4,
  13: 5,
  14: 7,
  15: 9
};

export const abilityOrder: AbilityScore[] = ["str", "dex", "con", "int", "wis", "cha"];

export function getAbilityScoreCost(score: number): number {
  return pointBuyCosts[score] ?? 0;
}

export function getPointBuyTotal(scores: Record<AbilityScore, number>): number {
  return abilityOrder.reduce((total, ability) => total + getAbilityScoreCost(scores[ability]), 0);
}

export function getAncestryByName(name: string): SrdAncestry | null {
  return srdAncestries.find((ancestry) => ancestry.name === name) ?? null;
}

export function getClassByName(name: string): SrdClass | null {
  return srdClasses.find((entry) => entry.name === name) ?? null;
}

export function applyAncestryBonuses(
  baseScores: Record<AbilityScore, number>,
  ancestry: SrdAncestry | null,
  selections: AbilityScore[]
): Record<AbilityScore, number> {
  const result = { ...baseScores };
  if (!ancestry) {
    return result;
  }

  for (const [ability, value] of Object.entries(ancestry.bonuses)) {
    const key = ability as AbilityScore;
    result[key] = (result[key] ?? 0) + (value ?? 0);
  }

  if (ancestry.bonusChoices) {
    const uniqueSelections = Array.from(new Set(selections)).slice(0, ancestry.bonusChoices.count);
    for (const ability of uniqueSelections) {
      result[ability] = (result[ability] ?? 0) + ancestry.bonusChoices.value;
    }
  }

  return result;
}

export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function calculateDerivedStats(input: {
  abilities: Record<AbilityScore, number>;
  level: number;
  className: string;
  ancestryName: string;
}): {
  hitPoints: number;
  hitPointMax: number;
  armorClass: number;
  initiativeBonus: number;
  speed: number;
} {
  const cls = getClassByName(input.className);
  const ancestry = getAncestryByName(input.ancestryName);
  const level = Math.max(1, Math.floor(input.level));
  const hitDie = cls?.hitDie ?? 8;
  const conMod = abilityModifier(input.abilities.con);
  const dexMod = abilityModifier(input.abilities.dex);
  const averageHit = Math.floor(hitDie / 2) + 1;
  const hitPointMax = Math.max(1, hitDie + conMod + (level - 1) * (averageHit + conMod));

  return {
    hitPoints: hitPointMax,
    hitPointMax,
    armorClass: 10 + dexMod,
    initiativeBonus: dexMod,
    speed: ancestry?.speed ?? 30
  };
}
