export type AbilityScore = "str" | "dex" | "con" | "int" | "wis" | "cha";

export type CharacterRole = "player" | "ally" | "npc";

export interface Character {
  id: string;
  name: string;
  role: CharacterRole;
  level: number;
  className: string;
  ancestry: string;
  background: string;
  alignment: string;
  hitPoints: number;
  hitPointMax: number;
  armorClass: number;
  initiativeBonus: number;
  speed: number;
  abilities: Record<AbilityScore, number>;
  proficiencies: string[];
  inventory: string[];
}

export interface Campaign {
  id: string;
  name: string;
  summary?: string;
  createdAt: string;
  updatedAt: string;
  activeSceneId?: string;
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
