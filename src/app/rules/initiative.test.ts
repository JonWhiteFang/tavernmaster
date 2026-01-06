import { describe, expect, it } from "vitest";
import { buildCondition } from "./conditions";
import { advanceTurn, buildTurnOrder, startEncounter } from "./initiative";
import type { RulesParticipant, RulesState } from "./types";

function sequenceRng(values: number[]) {
  let index = 0;
  return () => {
    const value = values[index] ?? 0;
    index += 1;
    return value;
  };
}

function participant(
  id: string,
  initBonus: number,
  conditions: RulesParticipant["conditions"] = []
): RulesParticipant {
  return {
    id,
    name: id,
    maxHp: 10,
    hp: 10,
    armorClass: 12,
    initiativeBonus: initBonus,
    speed: 30,
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    savingThrows: {},
    proficiencyBonus: 2,
    conditions
  };
}

describe("initiative", () => {
  it("breaks ties by higher raw roll", () => {
    const order = buildTurnOrder([
      { participantId: "a", roll: 10, total: 12 },
      { participantId: "b", roll: 12, total: 12 }
    ]);
    expect(order).toEqual(["b", "a"]);
  });

  it("starts an encounter with round 1 and ordered turn order", () => {
    const state: RulesState = {
      round: 0,
      turnOrder: [],
      activeTurnIndex: 0,
      log: [],
      participants: {
        a: participant("a", 2),
        b: participant("b", 0)
      }
    };

    const rng = sequenceRng([0.0, 0.95]); // 1 and 20
    const result = startEncounter(state, rng);
    expect(result.state.round).toBe(1);
    expect(result.state.activeTurnIndex).toBe(0);
    expect(result.state.turnOrder).toEqual(["b", "a"]);
    expect(result.rolls).toHaveLength(2);
  });

  it("advances turns and increments rounds while ticking end-of-turn conditions", () => {
    const state: RulesState = {
      round: 1,
      turnOrder: ["a", "b"],
      activeTurnIndex: 0,
      log: [],
      participants: {
        a: participant("a", 0, [buildCondition("dodging", 1)]),
        b: participant("b", 0)
      }
    };

    const afterA = advanceTurn(state);
    expect(afterA.activeTurnIndex).toBe(1);
    expect(afterA.round).toBe(1);
    expect(afterA.participants.a.conditions).toHaveLength(0);

    const afterB = advanceTurn(afterA);
    expect(afterB.activeTurnIndex).toBe(0);
    expect(afterB.round).toBe(2);
  });
});
