import { describe, expect, it } from "vitest";
import { applyEffects } from "./effects";
import type { RulesState } from "./types";

function sequenceRng(values: number[]) {
  let index = 0;
  return () => {
    const value = values[index] ?? 0;
    index += 1;
    return value;
  };
}

function baseState(): RulesState {
  return {
    round: 3,
    turnOrder: [],
    activeTurnIndex: 0,
    log: [],
    participants: {
      a: {
        id: "a",
        name: "A",
        maxHp: 20,
        hp: 20,
        armorClass: 12,
        initiativeBonus: 0,
        speed: 30,
        abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
        savingThrows: {},
        proficiencyBonus: 2,
        conditions: [],
        concentration: { spellId: "spell", startedRound: 1 }
      }
    }
  };
}

describe("effects", () => {
  it("applies damage and heal with clamps", () => {
    const state = baseState();
    const damaged = applyEffects(state, [
      { type: "damage", targetId: "a", amount: 30, damageType: "force" }
    ]);
    expect(damaged.participants.a.hp).toBe(0);

    const healed = applyEffects(damaged, [{ type: "heal", targetId: "a", amount: 50 }]);
    expect(healed.participants.a.hp).toBe(20);
  });

  it("breaks concentration on failed check and logs outcome", () => {
    const state = baseState();
    const rng = sequenceRng([0.0]); // d20 => 1
    const next = applyEffects(
      state,
      [{ type: "damage", targetId: "a", amount: 20, damageType: "force" }],
      rng
    );
    expect(next.participants.a.concentration).toBeUndefined();
    expect(next.log.join("\n")).toContain("loses concentration");
  });

  it("maintains concentration on success and logs outcome", () => {
    const state = baseState();
    const rng = sequenceRng([0.99]); // d20 => 20
    const next = applyEffects(
      state,
      [{ type: "damage", targetId: "a", amount: 20, damageType: "force" }],
      rng
    );
    expect(next.participants.a.concentration).toBeDefined();
    expect(next.log.join("\n")).toContain("maintains concentration");
  });

  it("consumes spell slots and sets concentration", () => {
    const state: RulesState = {
      ...baseState(),
      participants: {
        c: {
          id: "c",
          name: "Caster",
          maxHp: 10,
          hp: 10,
          armorClass: 10,
          initiativeBonus: 0,
          speed: 30,
          abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
          savingThrows: {},
          proficiencyBonus: 2,
          conditions: [],
          spellcasting: { spellSaveDc: 12, spellAttackBonus: 4, slots: { 1: { max: 2, used: 1 } } }
        }
      }
    };

    const next = applyEffects(state, [
      { type: "consumeSpellSlot", casterId: "c", level: 1 },
      { type: "setConcentration", casterId: "c", spellId: "spell-x" }
    ]);

    expect(next.participants.c.spellcasting?.slots[1]?.used).toBe(2);
    expect(next.participants.c.concentration?.spellId).toBe("spell-x");
    expect(next.participants.c.concentration?.startedRound).toBe(3);
  });
});
