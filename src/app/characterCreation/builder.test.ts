import { describe, expect, it } from "vitest";
import { applyRacialBonuses, deriveVitals, buildNewCharacterInput } from "./builder";
import type { SrdClass, SrdRace, SrdBackground } from "./types";
import type { CharacterCreationState } from "./state";
import { initialState } from "./state";

const fighter: SrdClass = { id: "class-fighter", name: "Fighter", hitDie: 10 };
const wizard: SrdClass = { id: "class-wizard", name: "Wizard", hitDie: 6 };

const human: SrdRace = {
  id: "race-human",
  name: "Human",
  speed: 30,
  abilityBonuses: { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 }
};

const dwarf: SrdRace = {
  id: "race-dwarf",
  name: "Hill Dwarf",
  speed: 25,
  abilityBonuses: { con: 2, wis: 1 }
};

const soldier: SrdBackground = {
  id: "bg-soldier",
  name: "Soldier",
  skillProficiencies: ["Athletics", "Intimidation"]
};

describe("builder", () => {
  describe("applyRacialBonuses", () => {
    it("applies human bonuses (+1 to all)", () => {
      const base = { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 };
      const result = applyRacialBonuses(base, human);
      expect(result).toEqual({ str: 16, dex: 15, con: 14, int: 13, wis: 11, cha: 9 });
    });

    it("applies dwarf bonuses (+2 CON, +1 WIS)", () => {
      const base = { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 };
      const result = applyRacialBonuses(base, dwarf);
      expect(result).toEqual({ str: 15, dex: 14, con: 15, int: 12, wis: 11, cha: 8 });
    });

    it("returns copy when race is null", () => {
      const base = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
      const result = applyRacialBonuses(base, null);
      expect(result).toEqual(base);
      expect(result).not.toBe(base);
    });
  });

  describe("deriveVitals", () => {
    it("calculates fighter level 1 vitals", () => {
      const scores = { str: 16, dex: 14, con: 14, int: 10, wis: 12, cha: 8 };
      const vitals = deriveVitals({ level: 1, srdClass: fighter, race: human, scores });
      // HP: 10 (hitDie) + 2 (conMod) = 12
      // AC: 10 + 2 (dexMod) = 12
      // Initiative: +2
      // Speed: 30
      expect(vitals.hitPointMax).toBe(12);
      expect(vitals.hitPoints).toBe(12);
      expect(vitals.armorClass).toBe(12);
      expect(vitals.initiativeBonus).toBe(2);
      expect(vitals.speed).toBe(30);
    });

    it("calculates wizard level 1 vitals", () => {
      const scores = { str: 8, dex: 14, con: 12, int: 16, wis: 13, cha: 10 };
      const vitals = deriveVitals({ level: 1, srdClass: wizard, race: human, scores });
      // HP: 6 (hitDie) + 1 (conMod) = 7
      expect(vitals.hitPointMax).toBe(7);
      expect(vitals.armorClass).toBe(12);
    });

    it("calculates dwarf speed correctly", () => {
      const scores = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
      const vitals = deriveVitals({ level: 1, srdClass: fighter, race: dwarf, scores });
      expect(vitals.speed).toBe(25);
    });

    it("uses defaults when class/race null", () => {
      const scores = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
      const vitals = deriveVitals({ level: 1, srdClass: null, race: null, scores });
      // Default hitDie 8, conMod 0 -> HP 8
      expect(vitals.hitPointMax).toBe(8);
      expect(vitals.speed).toBe(30);
    });

    it("ensures minimum 1 HP", () => {
      const scores = { str: 10, dex: 10, con: 3, int: 10, wis: 10, cha: 10 }; // -4 CON mod
      const vitals = deriveVitals({ level: 1, srdClass: wizard, race: null, scores });
      // 6 - 4 = 2, but let's check the formula
      expect(vitals.hitPointMax).toBeGreaterThanOrEqual(1);
    });
  });

  describe("buildNewCharacterInput", () => {
    it("builds complete input from wizard state", () => {
      const state: CharacterCreationState = {
        ...initialState,
        step: "confirm",
        abilityMethod: "standard",
        rolledScores: [15, 14, 13, 12, 10, 8],
        assignments: { str: 0, dex: 1, con: 2, int: 3, wis: 4, cha: 5 },
        pointBuyScores: { str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 },
        selectedClass: fighter,
        selectedRace: human,
        selectedBackground: soldier,
        name: "Thorin",
        alignment: "Lawful Good"
      };

      const input = buildNewCharacterInput(state);

      expect(input.name).toBe("Thorin");
      expect(input.role).toBe("player");
      expect(input.controlMode).toBe("player");
      expect(input.level).toBe(1);
      expect(input.className).toBe("Fighter");
      expect(input.ancestry).toBe("Human");
      expect(input.background).toBe("Soldier");
      expect(input.alignment).toBe("Lawful Good");
      // Base 15,14,13,12,10,8 + human +1 all = 16,15,14,13,11,9
      expect(input.abilities).toEqual({ str: 16, dex: 15, con: 14, int: 13, wis: 11, cha: 9 });
      expect(input.proficiencies).toEqual(["Athletics", "Intimidation"]);
      expect(input.inventory).toEqual([]);
      expect(input.spells).toEqual([]);
      expect(input.hitPointMax).toBe(12); // 10 + 2 (con 14 = +2)
    });

    it("handles missing selections gracefully", () => {
      const state: CharacterCreationState = {
        ...initialState,
        name: "Unknown"
      };

      const input = buildNewCharacterInput(state);

      expect(input.name).toBe("Unknown");
      expect(input.className).toBe("");
      expect(input.ancestry).toBe("");
      expect(input.background).toBe("");
      expect(input.proficiencies).toEqual([]);
    });
  });
});
