import type { RandomSource } from "./rng";
import type { RulesParticipant, RulesState, RollSummary } from "./types";
import { rollD20 } from "./dice";
import { tickEndOfTurn } from "./conditions";

export type InitiativeRoll = {
  participantId: string;
  total: number;
  roll: number;
};

export function rollInitiative(
  participants: RulesParticipant[],
  rng: RandomSource
): InitiativeRoll[] {
  return participants.map((participant) => {
    const roll = rollD20(rng);
    return {
      participantId: participant.id,
      roll,
      total: roll + participant.initiativeBonus
    };
  });
}

export function buildTurnOrder(rolls: InitiativeRoll[]): string[] {
  return [...rolls]
    .sort((a, b) => {
      if (a.total !== b.total) {
        return b.total - a.total;
      }
      return b.roll - a.roll;
    })
    .map((roll) => roll.participantId);
}

export function startEncounter(
  state: RulesState,
  rng: RandomSource
): {
  state: RulesState;
  rolls: RollSummary[];
} {
  const participants = Object.values(state.participants);
  const initiative = rollInitiative(participants, rng);
  const order = buildTurnOrder(initiative);

  const rolls: RollSummary[] = initiative.map((entry) => ({
    label: `${state.participants[entry.participantId]?.name ?? "Unknown"} Initiative`,
    rolls: [entry.roll],
    total: entry.total
  }));

  return {
    state: {
      ...state,
      round: 1,
      turnOrder: order,
      activeTurnIndex: 0
    },
    rolls
  };
}

export function advanceTurn(state: RulesState): RulesState {
  if (state.turnOrder.length === 0) {
    return state;
  }

  const currentId = state.turnOrder[state.activeTurnIndex];
  const nextIndex = (state.activeTurnIndex + 1) % state.turnOrder.length;
  const nextRound = nextIndex === 0 ? state.round + 1 : state.round;

  const updatedParticipant = currentId ? tickEndOfTurn(state.participants[currentId]) : undefined;

  return {
    ...state,
    round: nextRound,
    activeTurnIndex: nextIndex,
    participants: updatedParticipant
      ? { ...state.participants, [currentId]: updatedParticipant }
      : state.participants
  };
}
