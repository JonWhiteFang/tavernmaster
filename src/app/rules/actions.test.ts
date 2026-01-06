import { describe, expect, it } from "vitest";
import { resolveAction, validateAction } from "./actions";
import type { RulesState } from "./types";

function sequenceRng(values: number[]) {
  let index = 0;
  return () => {
    const value = values[index] ?? 0;
    index += 1;
    return value;
  };
}

const baseState: RulesState = {
  round: 1,
  turnOrder: ["attacker", "target"],
  activeTurnIndex: 0,
  log: [],
  participants: {
    attacker: {
      id: "attacker",
      name: "Blade",
      maxHp: 20,
      hp: 20,
      armorClass: 14,
      initiativeBonus: 2,
      speed: 30,
      abilities: { str: 14, dex: 12, con: 12, int: 10, wis: 10, cha: 8 },
      savingThrows: {},
      proficiencyBonus: 2,
      conditions: []
    },
    target: {
      id: "target",
      name: "Goblin",
      maxHp: 7,
      hp: 7,
      armorClass: 13,
      initiativeBonus: 2,
      speed: 30,
      abilities: { str: 8, dex: 14, con: 10, int: 10, wis: 8, cha: 8 },
      savingThrows: {},
      proficiencyBonus: 2,
      conditions: []
    }
  }
};

describe("action resolution", () => {
  it("resolves a critical hit attack", () => {
    const rng = sequenceRng([0.99, 0.0, 0.0]);
    const result = resolveAction(
      {
        type: "attack",
        attackerId: "attacker",
        targetId: "target",
        attackBonus: 5,
        damage: "1d6+2",
        damageType: "slashing",
        isMelee: true
      },
      baseState,
      rng
    );

    expect(result.ok).toBe(true);
    const damage = result.effects.find((effect) => effect.type === "damage");
    expect(damage && "amount" in damage ? damage.amount : 0).toBe(4);
  });

  it("validates missing targets", () => {
    const result = validateAction(
      {
        type: "attack",
        attackerId: "attacker",
        targetId: "missing",
        attackBonus: 5,
        damage: "1d6+2",
        damageType: "slashing"
      },
      baseState
    );

    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain("Target not found");
  });

  it("adds a dodging condition for the dodge action", () => {
    const rng = sequenceRng([]);
    const result = resolveAction({ type: "dodge", actorId: "attacker" }, baseState, rng);
    expect(result.ok).toBe(true);
    const effect = result.effects.find((entry) => entry.type === "addCondition");
    expect(effect && "condition" in effect ? effect.condition.name : "").toBe("dodging");
  });
});
