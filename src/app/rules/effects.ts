import type { Effect, RulesParticipant, RulesState } from "./types";
import type { RandomSource } from "./rng";
import { rollD20WithAdvantage } from "./dice";

function getParticipant(state: RulesState, id: string): RulesParticipant | undefined {
  return state.participants[id];
}

function updateParticipant(
  state: RulesState,
  id: string,
  updater: (_participant: RulesParticipant) => RulesParticipant
): RulesState {
  const current = getParticipant(state, id);
  if (!current) {
    return state;
  }
  return {
    ...state,
    participants: {
      ...state.participants,
      [id]: updater(current)
    }
  };
}

function appendLog(state: RulesState, message: string): RulesState {
  return {
    ...state,
    log: [...state.log, message]
  };
}

function getSavingThrowBonus(
  participant: RulesParticipant,
  ability: keyof RulesParticipant["abilities"]
): number {
  const explicit = participant.savingThrows[ability];
  if (explicit !== undefined) {
    return explicit;
  }
  const score = participant.abilities[ability];
  return Math.floor((score - 10) / 2);
}

export function applyEffects(state: RulesState, effects: Effect[], rng?: RandomSource): RulesState {
  let nextState = { ...state };

  for (const effect of effects) {
    switch (effect.type) {
      case "damage": {
        nextState = updateParticipant(nextState, effect.targetId, (participant) => {
          const nextHp = Math.max(0, participant.hp - effect.amount);
          return { ...participant, hp: nextHp };
        });

        const target = getParticipant(nextState, effect.targetId);
        if (target?.concentration && effect.amount > 0 && rng) {
          const dc = Math.max(10, Math.floor(effect.amount / 2));
          const roll = rollD20WithAdvantage(rng, "normal");
          const bonus = getSavingThrowBonus(target, "con");
          const total = roll.chosen + bonus;
          if (total < dc) {
            nextState = updateParticipant(nextState, effect.targetId, (participant) => ({
              ...participant,
              concentration: undefined
            }));
            nextState = appendLog(
              nextState,
              `${target.name} loses concentration (DC ${dc} failed).`
            );
          } else {
            nextState = appendLog(
              nextState,
              `${target.name} maintains concentration (DC ${dc} succeeded).`
            );
          }
        }
        break;
      }
      case "heal": {
        nextState = updateParticipant(nextState, effect.targetId, (participant) => {
          const nextHp = Math.min(participant.maxHp, participant.hp + effect.amount);
          return { ...participant, hp: nextHp };
        });
        break;
      }
      case "addCondition": {
        nextState = updateParticipant(nextState, effect.targetId, (participant) => ({
          ...participant,
          conditions: [...participant.conditions, effect.condition]
        }));
        break;
      }
      case "removeCondition": {
        nextState = updateParticipant(nextState, effect.targetId, (participant) => ({
          ...participant,
          conditions: participant.conditions.filter(
            (condition) => condition.name !== effect.conditionName.toLowerCase()
          )
        }));
        break;
      }
      case "consumeSpellSlot": {
        nextState = updateParticipant(nextState, effect.casterId, (participant) => {
          if (!participant.spellcasting) {
            return participant;
          }
          const current = participant.spellcasting.slots[effect.level];
          if (!current) {
            return participant;
          }
          return {
            ...participant,
            spellcasting: {
              ...participant.spellcasting,
              slots: {
                ...participant.spellcasting.slots,
                [effect.level]: {
                  ...current,
                  used: Math.min(current.max, current.used + 1)
                }
              }
            }
          };
        });
        break;
      }
      case "setConcentration": {
        nextState = updateParticipant(nextState, effect.casterId, (participant) => ({
          ...participant,
          concentration: {
            spellId: effect.spellId,
            startedRound: nextState.round
          }
        }));
        break;
      }
      case "clearConcentration": {
        nextState = updateParticipant(nextState, effect.casterId, (participant) => ({
          ...participant,
          concentration: undefined
        }));
        break;
      }
      case "log": {
        nextState = appendLog(nextState, effect.message);
        break;
      }
      default:
        break;
    }
  }

  return nextState;
}
