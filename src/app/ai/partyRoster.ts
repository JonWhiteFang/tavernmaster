import type { Character } from "../data/types";
import type { RulesParticipant, RulesState } from "../rules/types";

export function buildRoster(characters: Character[]): string {
  return characters
    .map((character) => `${character.name} (${character.className} ${character.level})`)
    .join("\n");
}

export function buildRulesState(characters: Character[]): RulesState {
  const participants: Record<string, RulesParticipant> = {};
  for (const character of characters) {
    participants[character.id] = {
      id: character.id,
      name: character.name,
      maxHp: character.hitPointMax,
      hp: character.hitPoints,
      armorClass: character.armorClass,
      initiativeBonus: character.initiativeBonus,
      speed: character.speed,
      abilities: character.abilities,
      savingThrows: {},
      proficiencyBonus: getProficiencyBonus(character.level),
      conditions: []
    };
  }

  return {
    round: 1,
    turnOrder: characters.map((character) => character.id),
    activeTurnIndex: 0,
    participants,
    log: []
  };
}

function getProficiencyBonus(level: number): number {
  return Math.floor((level - 1) / 4) + 2;
}
