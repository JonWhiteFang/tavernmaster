import { describe, expect, it } from "vitest";
import {
  buildCondition,
  deriveAttackAdvantage,
  hasCondition,
  removeCondition,
  tickEndOfTurn
} from "./conditions";
import type { RulesParticipant } from "./types";

function participantWithConditions(
  conditions: Array<{ name: string; remainingRounds: number | null }>
): RulesParticipant {
  return {
    id: "p1",
    name: "Hero",
    maxHp: 10,
    hp: 10,
    armorClass: 12,
    initiativeBonus: 0,
    speed: 30,
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    savingThrows: {},
    proficiencyBonus: 2,
    conditions: conditions.map((entry) => buildCondition(entry.name, entry.remainingRounds))
  };
}

describe("conditions", () => {
  it("checks conditions case-insensitively", () => {
    const participant = participantWithConditions([{ name: "Poisoned", remainingRounds: 1 }]);
    expect(hasCondition(participant, "poisoned")).toBe(true);
    expect(hasCondition(participant, "POISONED")).toBe(true);
    expect(hasCondition(participant, "stunned")).toBe(false);
  });

  it("removes conditions case-insensitively", () => {
    const participant = participantWithConditions([
      { name: "Poisoned", remainingRounds: 1 },
      { name: "Stunned", remainingRounds: 1 }
    ]);
    const updated = removeCondition(participant, "poisoned");
    expect(hasCondition(updated, "poisoned")).toBe(false);
    expect(hasCondition(updated, "stunned")).toBe(true);
  });

  it("ticks end of turn durations and removes expired conditions", () => {
    const participant = participantWithConditions([
      { name: "Dodging", remainingRounds: 1 },
      { name: "Hidden", remainingRounds: 2 },
      { name: "Blessed", remainingRounds: null }
    ]);

    const next = tickEndOfTurn(participant);
    expect(hasCondition(next, "dodging")).toBe(false);
    expect(next.conditions.find((c) => c.name === "hidden")?.remainingRounds).toBe(1);
    expect(next.conditions.find((c) => c.name === "blessed")?.remainingRounds).toBeNull();
  });

  it("derives attack advantage from attacker/target conditions", () => {
    const attacker = participantWithConditions([{ name: "Hidden", remainingRounds: 1 }]);
    const target = participantWithConditions([]);
    expect(deriveAttackAdvantage(attacker, target, "normal", true)).toBe("advantage");
  });

  it("normalizes advantage/disadvantage to normal when both apply", () => {
    const attacker = participantWithConditions([
      { name: "Hidden", remainingRounds: 1 },
      { name: "Blinded", remainingRounds: 1 }
    ]);
    const target = participantWithConditions([]);
    expect(deriveAttackAdvantage(attacker, target, "normal", true)).toBe("normal");
  });

  it("applies prone and dodging correctly", () => {
    const attacker = participantWithConditions([]);
    const target = participantWithConditions([
      { name: "Prone", remainingRounds: 1 },
      { name: "Dodging", remainingRounds: 1 }
    ]);

    expect(deriveAttackAdvantage(attacker, target, "normal", true)).toBe("normal");
    expect(deriveAttackAdvantage(attacker, target, "normal", false)).toBe("disadvantage");
  });
});
