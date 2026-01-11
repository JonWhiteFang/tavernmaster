export type AbilityScore = "str" | "dex" | "con" | "int" | "wis" | "cha";

export type CharacterRole = "player" | "ally" | "npc";

export type CharacterControl = "player" | "ai";

export type CharacterInventoryItem = {
  id: string;
  itemId: string;
  name: string;
  quantity: number;
  attuned: boolean;
};

export type CharacterSpell = {
  id: string;
  spellId: string;
  name: string;
  level?: number;
  school?: string;
  prepared: boolean;
  slotsUsed: number;
};

export interface Character {
  id: string;
  campaignId?: string;
  name: string;
  role: CharacterRole;
  controlMode: CharacterControl;
  level: number;
  className: string;
  ancestry: string;
  background: string;
  alignment: string;
  ancestryBonusSelections: AbilityScore[];
  hitPoints: number;
  hitPointMax: number;
  armorClass: number;
  initiativeBonus: number;
  speed: number;
  abilities: Record<AbilityScore, number>;
  proficiencies: string[];
  inventory: CharacterInventoryItem[];
  spells: CharacterSpell[];
}

export interface Campaign {
  id: string;
  name: string;
  summary?: string;
  createdAt: string;
  updatedAt: string;
  activeSceneId?: string;
}

export interface Session {
  id: string;
  campaignId: string;
  title: string;
  startedAt?: string;
  endedAt?: string;
  recap?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Encounter {
  id: string;
  campaignId: string;
  name: string;
  environment: string;
  difficulty: "easy" | "medium" | "hard" | "deadly";
  round: number;
  initiativeOrder: string[];
  activeTurnId?: string;
  conditions: string[];
  createdAt: string;
  updatedAt: string;
}

export interface JournalEntry {
  id: string;
  campaignId: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActionProposal {
  id: string;
  characterId: string;
  summary: string;
  rulesRefs: string[];
  status: "pending" | "approved" | "rejected" | "executed";
}
