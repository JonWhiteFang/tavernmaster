import { describe, expect, it } from "vitest";
import { buildRoster, buildRulesState } from "./partyRoster";
import type { Character } from "../data/types";

describe("party roster helpers", () => {
  const characters: Character[] = [
    {
      id: "char-1",
      campaignId: "camp-1",
      name: "Aria",
      className: "Rogue",
      level: 3,
      experience: 900,
      ancestry: "Elf",
      background: "Urchin",
      alignment: "Chaotic Good",
      hitPointMax: 20,
      hitPoints: 18,
      armorClass: 15,
      initiativeBonus: 4,
      speed: 30,
      abilities: {
        strength: 10,
        dexterity: 16,
        constitution: 12,
        intelligence: 14,
        wisdom: 11,
        charisma: 13
      },
      proficiencies: [],
      ancestryBonus: [],
      inventory: [],
      spells: [],
      createdAt: "now",
      updatedAt: "now",
      controlMode: "player"
    },
    {
      id: "char-2",
      campaignId: "camp-1",
      name: "Borin",
      className: "Fighter",
      level: 5,
      experience: 6500,
      ancestry: "Dwarf",
      background: "Soldier",
      alignment: "Lawful Neutral",
      hitPointMax: 45,
      hitPoints: 42,
      armorClass: 17,
      initiativeBonus: 1,
      speed: 25,
      abilities: {
        strength: 16,
        dexterity: 10,
        constitution: 14,
        intelligence: 8,
        wisdom: 12,
        charisma: 9
      },
      proficiencies: [],
      ancestryBonus: [],
      inventory: [],
      spells: [],
      createdAt: "now",
      updatedAt: "now",
      controlMode: "player"
    }
  ];

  it("builds a display roster with character IDs", () => {
    expect(buildRoster(characters)).toBe("[char-1] Aria (Rogue 3)\n[char-2] Borin (Fighter 5)");
  });

  it("builds a rules state with participants", () => {
    const state = buildRulesState(characters);

    expect(state.turnOrder).toEqual(["char-1", "char-2"]);
    expect(state.participants["char-1"]).toMatchObject({
      name: "Aria",
      hp: 18,
      armorClass: 15,
      proficiencyBonus: 2
    });
    expect(state.participants["char-2"].proficiencyBonus).toBe(3);
  });
});
