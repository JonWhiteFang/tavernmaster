export type AbilityKey = "str" | "dex" | "con" | "int" | "wis" | "cha";

export type AbilityBonuses = Partial<Record<AbilityKey, number>>;

export interface SrdClass {
  id: string;
  name: string;
  hitDie: number;
  startingItemIds: string[];
}

export interface SrdItem {
  id: string;
  name: string;
}

export interface BonusChoices {
  count: number;
  value: number;
  options: AbilityKey[];
}

export interface SrdRace {
  id: string;
  name: string;
  speed: number;
  abilityBonuses: AbilityBonuses;
  bonusChoices?: BonusChoices;
}

export interface SrdBackground {
  id: string;
  name: string;
  skillProficiencies: string[];
}
