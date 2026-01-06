import type {
  AbilityScore,
  Action,
  ActionResolution,
  ActionValidation,
  AttackAction,
  CastAction,
  Effect,
  RulesParticipant,
  RulesState,
  RollSummary
} from "./types";
import type { RandomSource } from "./rng";
import { normalizeAdvantage, parseDiceExpression, rollD20WithAdvantage, rollDice } from "./dice";
import { buildCondition, deriveAttackAdvantage, hasCondition } from "./conditions";

const incapacitatingConditions = new Set(["incapacitated", "paralyzed", "stunned", "unconscious"]);

function getParticipant(state: RulesState, id: string): RulesParticipant | undefined {
  return state.participants[id];
}

function canAct(participant: RulesParticipant): boolean {
  if (participant.hp <= 0) {
    return false;
  }
  return !participant.conditions.some((condition) => incapacitatingConditions.has(condition.name));
}

function baseValidation(action: Action, state: RulesState): ActionValidation {
  switch (action.type) {
    case "attack": {
      const attacker = getParticipant(state, action.attackerId);
      const target = getParticipant(state, action.targetId);
      const errors: string[] = [];
      if (!attacker) {
        errors.push("Attacker not found.");
      }
      if (!target) {
        errors.push("Target not found.");
      }
      if (attacker && !canAct(attacker)) {
        errors.push("Attacker cannot act.");
      }
      return { ok: errors.length === 0, errors };
    }
    case "cast": {
      const caster = getParticipant(state, action.casterId);
      const errors: string[] = [];
      if (!caster) {
        errors.push("Caster not found.");
      }
      if (caster && !canAct(caster)) {
        errors.push("Caster cannot act.");
      }
      if (caster && action.slotLevel > 0) {
        const slots = caster.spellcasting?.slots[action.slotLevel];
        if (!slots) {
          errors.push("Spell slot level unavailable.");
        } else if (slots.used >= slots.max) {
          errors.push("No remaining spell slots.");
        }
      }
      if (action.targetIds.length === 0) {
        errors.push("Spell requires at least one target.");
      }
      return { ok: errors.length === 0, errors };
    }
    case "dash":
    case "dodge":
    case "disengage":
    case "hide":
    case "ready":
    case "use-object": {
      const actorId = "actorId" in action ? action.actorId : undefined;
      const actor = actorId ? getParticipant(state, actorId) : undefined;
      const errors: string[] = [];
      if (!actor) {
        errors.push("Actor not found.");
      }
      if (actor && !canAct(actor)) {
        errors.push("Actor cannot act.");
      }
      return { ok: errors.length === 0, errors };
    }
    case "help": {
      const helper = getParticipant(state, action.helperId);
      const target = getParticipant(state, action.targetId);
      const errors: string[] = [];
      if (!helper) {
        errors.push("Helper not found.");
      }
      if (!target) {
        errors.push("Help target not found.");
      }
      if (helper && !canAct(helper)) {
        errors.push("Helper cannot act.");
      }
      return { ok: errors.length === 0, errors };
    }
    default:
      return { ok: false, errors: ["Unknown action."] };
  }
}

function resolveAttack(
  action: AttackAction,
  state: RulesState,
  rng: RandomSource
): ActionResolution {
  const attacker = getParticipant(state, action.attackerId);
  const target = getParticipant(state, action.targetId);

  if (!attacker || !target) {
    return {
      ok: false,
      action,
      errors: ["Missing attacker or target."],
      effects: [],
      rolls: [],
      log: []
    };
  }

  const advantage = deriveAttackAdvantage(
    attacker,
    target,
    action.advantage ?? "normal",
    action.isMelee ?? true
  );

  const attackRoll = rollD20WithAdvantage(rng, advantage);
  const attackTotal = attackRoll.chosen + action.attackBonus;
  const hit = attackTotal >= target.armorClass;

  const rolls: RollSummary[] = [
    {
      label: "Attack Roll",
      rolls: [...attackRoll.rolls],
      total: attackTotal,
      detail: `AC ${target.armorClass}`
    }
  ];

  const effects: Effect[] = [];
  const log: string[] = [];

  if (hit) {
    const damageExpression = parseDiceExpression(action.damage);
    const multiplier = attackRoll.isCritical ? 2 : 1;
    const damageRoll = rollDice(
      { ...damageExpression, count: damageExpression.count * multiplier },
      rng
    );
    const damageTotal = damageRoll.total;

    effects.push({
      type: "damage",
      targetId: target.id,
      amount: damageTotal,
      damageType: action.damageType,
      sourceId: attacker.id
    });

    rolls.push({
      label: "Damage",
      rolls: damageRoll.rolls,
      total: damageTotal,
      detail: attackRoll.isCritical ? "Critical hit" : undefined
    });

    log.push(
      `${attacker.name} hits ${target.name} for ${damageTotal} ${action.damageType} damage.`
    );
  } else {
    log.push(`${attacker.name} misses ${target.name}.`);
  }

  if (hasCondition(attacker, "helped")) {
    effects.push({
      type: "removeCondition",
      targetId: attacker.id,
      conditionName: "helped"
    });
  }

  if (hasCondition(attacker, "hidden")) {
    effects.push({
      type: "removeCondition",
      targetId: attacker.id,
      conditionName: "hidden"
    });
  }

  return {
    ok: true,
    action,
    errors: [],
    effects,
    rolls,
    log
  };
}

function resolveCast(action: CastAction, state: RulesState, rng: RandomSource): ActionResolution {
  const caster = getParticipant(state, action.casterId);
  if (!caster) {
    return {
      ok: false,
      action,
      errors: ["Caster not found."],
      effects: [],
      rolls: [],
      log: []
    };
  }

  const effects: Effect[] = [];
  const rolls: RollSummary[] = [];
  const log: string[] = [];

  if (action.slotLevel > 0) {
    effects.push({ type: "consumeSpellSlot", casterId: caster.id, level: action.slotLevel });
  }

  if (action.concentration) {
    if (caster.concentration) {
      effects.push({ type: "clearConcentration", casterId: caster.id });
    }
    effects.push({ type: "setConcentration", casterId: caster.id, spellId: action.spellId });
  }

  const attackBonus = action.attack?.bonus ?? caster.spellcasting?.spellAttackBonus ?? 0;
  const saveDc = action.save?.dc ?? caster.spellcasting?.spellSaveDc ?? 10;
  const damageDice = action.damage?.dice ? parseDiceExpression(action.damage.dice) : null;

  for (const targetId of action.targetIds) {
    const target = getParticipant(state, targetId);
    if (!target) {
      continue;
    }

    let hit = true;

    if (action.attack) {
      const advantage = normalizeAdvantage([
        action.attack.advantage ?? "normal",
        deriveAttackAdvantage(caster, target, "normal", action.attack.isMelee ?? false)
      ]);
      const attackRoll = rollD20WithAdvantage(rng, advantage);
      const total = attackRoll.chosen + attackBonus;
      hit = total >= target.armorClass;
      rolls.push({
        label: `${target.name} Spell Attack`,
        rolls: [...attackRoll.rolls],
        total,
        detail: `AC ${target.armorClass}`
      });
    }

    if (!hit) {
      log.push(`${caster.name}'s spell misses ${target.name}.`);
      continue;
    }

    let saveSucceeded = false;
    if (action.save) {
      const bonus = getSavingThrowBonus(target, action.save.ability);
      const saveRoll = rollD20WithAdvantage(rng, "normal");
      const total = saveRoll.chosen + bonus;
      saveSucceeded = total >= saveDc;
      rolls.push({
        label: `${target.name} ${action.save.ability.toUpperCase()} Save`,
        rolls: [...saveRoll.rolls],
        total,
        detail: `DC ${saveDc}`
      });
    }

    if (damageDice) {
      const damageRoll = rollDice(damageDice, rng);
      const fullDamage = damageRoll.total;
      const damage =
        saveSucceeded && action.save?.halfOnSave ? Math.floor(fullDamage / 2) : fullDamage;
      if (!saveSucceeded || (saveSucceeded && action.save?.halfOnSave)) {
        effects.push({
          type: "damage",
          targetId,
          amount: damage,
          damageType: action.damage?.type ?? "force",
          sourceId: caster.id
        });
        rolls.push({
          label: `${target.name} Spell Damage`,
          rolls: damageRoll.rolls,
          total: damage,
          detail: saveSucceeded && action.save?.halfOnSave ? "Half on save" : undefined
        });
      }
    }

    if (action.condition && (!action.save || !saveSucceeded)) {
      effects.push({
        type: "addCondition",
        targetId,
        condition: buildCondition(
          action.condition.name,
          action.condition.durationRounds ?? 1,
          caster.id
        )
      });
      log.push(`${target.name} gains ${action.condition.name}.`);
    }

    if (action.save && saveSucceeded) {
      log.push(`${target.name} resists part of ${caster.name}'s spell.`);
    } else if (!action.save && action.damage) {
      log.push(`${caster.name} hits ${target.name} with ${action.spellId}.`);
    }
  }

  return {
    ok: true,
    action,
    errors: [],
    effects,
    rolls,
    log
  };
}

function resolveBasicAction(
  action: Action,
  _state: RulesState
): { effects: Effect[]; log: string[] } {
  const effects: Effect[] = [];
  const log: string[] = [];

  switch (action.type) {
    case "dash": {
      effects.push({
        type: "addCondition",
        targetId: action.actorId,
        condition: buildCondition("dashing", 1, action.actorId)
      });
      log.push("Dash action: speed doubled for the turn.");
      break;
    }
    case "dodge": {
      effects.push({
        type: "addCondition",
        targetId: action.actorId,
        condition: buildCondition("dodging", 1, action.actorId)
      });
      log.push("Dodge action: attackers have disadvantage.");
      break;
    }
    case "disengage": {
      effects.push({
        type: "addCondition",
        targetId: action.actorId,
        condition: buildCondition("disengaged", 1, action.actorId)
      });
      log.push("Disengage action: no opportunity attacks this turn.");
      break;
    }
    case "hide": {
      effects.push({
        type: "addCondition",
        targetId: action.actorId,
        condition: buildCondition("hidden", 1, action.actorId)
      });
      log.push("Hide action: become hidden until discovered.");
      break;
    }
    case "help": {
      effects.push({
        type: "addCondition",
        targetId: action.targetId,
        condition: buildCondition("helped", 1, action.helperId)
      });
      log.push("Help action: target gains advantage on next roll.");
      break;
    }
    case "ready": {
      effects.push({
        type: "addCondition",
        targetId: action.actorId,
        condition: buildCondition("readying", 1, action.actorId)
      });
      log.push(`Ready action: ${action.trigger}.`);
      break;
    }
    case "use-object": {
      log.push(`Use object: ${action.description}.`);
      break;
    }
    default:
      break;
  }

  return { effects, log };
}

function getSavingThrowBonus(participant: RulesParticipant, ability: AbilityScore): number {
  const explicit = participant.savingThrows[ability];
  if (explicit !== undefined) {
    return explicit;
  }
  const score = participant.abilities[ability];
  return Math.floor((score - 10) / 2);
}

export function validateAction(action: Action, state: RulesState): ActionValidation {
  return baseValidation(action, state);
}

export function resolveAction(
  action: Action,
  state: RulesState,
  rng: RandomSource
): ActionResolution {
  const validation = baseValidation(action, state);
  if (!validation.ok) {
    return {
      ok: false,
      action,
      errors: validation.errors,
      effects: [],
      rolls: [],
      log: []
    };
  }

  switch (action.type) {
    case "attack":
      return resolveAttack(action, state, rng);
    case "cast":
      return resolveCast(action, state, rng);
    default: {
      const result = resolveBasicAction(action, state);
      return {
        ok: true,
        action,
        errors: [],
        effects: result.effects,
        rolls: [],
        log: result.log
      };
    }
  }
}
