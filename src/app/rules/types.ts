export type AbilityScore = "str" | "dex" | "con" | "int" | "wis" | "cha";

export type AdvantageState = "normal" | "advantage" | "disadvantage";

export type ConditionInstance = {
  id: string;
  name: string;
  remainingRounds: number | null;
  sourceId?: string;
};

export type SpellSlot = {
  max: number;
  used: number;
};

export type Spellcasting = {
  spellSaveDc: number;
  spellAttackBonus: number;
  slots: Record<number, SpellSlot>;
};

export type Concentration = {
  spellId: string;
  startedRound: number;
};

export type RulesParticipant = {
  id: string;
  name: string;
  maxHp: number;
  hp: number;
  armorClass: number;
  initiativeBonus: number;
  speed: number;
  abilities: Record<AbilityScore, number>;
  savingThrows: Partial<Record<AbilityScore, number>>;
  proficiencyBonus: number;
  conditions: ConditionInstance[];
  spellcasting?: Spellcasting;
  concentration?: Concentration;
};

export type RulesState = {
  round: number;
  turnOrder: string[];
  activeTurnIndex: number;
  participants: Record<string, RulesParticipant>;
  log: string[];
};

export type ActionValidation = {
  ok: boolean;
  errors: string[];
};

export type RollSummary = {
  label: string;
  rolls: number[];
  total: number;
  detail?: string;
};

export type ActionResolution = {
  ok: boolean;
  action: Action;
  errors: string[];
  effects: Effect[];
  rolls: RollSummary[];
  log: string[];
};

export type Effect =
  | {
      type: "damage";
      targetId: string;
      amount: number;
      damageType: string;
      sourceId?: string;
    }
  | {
      type: "heal";
      targetId: string;
      amount: number;
      sourceId?: string;
    }
  | {
      type: "addCondition";
      targetId: string;
      condition: ConditionInstance;
    }
  | {
      type: "removeCondition";
      targetId: string;
      conditionName: string;
    }
  | {
      type: "consumeSpellSlot";
      casterId: string;
      level: number;
    }
  | {
      type: "setConcentration";
      casterId: string;
      spellId: string;
    }
  | {
      type: "clearConcentration";
      casterId: string;
    }
  | {
      type: "log";
      message: string;
    };

export type AttackAction = {
  type: "attack";
  attackerId: string;
  targetId: string;
  attackBonus: number;
  damage: string;
  damageType: string;
  advantage?: AdvantageState;
  isMelee?: boolean;
};

export type CastAction = {
  type: "cast";
  casterId: string;
  spellId: string;
  slotLevel: number;
  targetIds: string[];
  attack?: {
    bonus?: number;
    advantage?: AdvantageState;
    isMelee?: boolean;
  };
  save?: {
    ability: AbilityScore;
    dc?: number;
    halfOnSave?: boolean;
  };
  damage?: {
    dice: string;
    type: string;
  };
  condition?: {
    name: string;
    durationRounds?: number | null;
  };
  concentration?: boolean;
};

export type DashAction = {
  type: "dash";
  actorId: string;
};

export type DodgeAction = {
  type: "dodge";
  actorId: string;
};

export type DisengageAction = {
  type: "disengage";
  actorId: string;
};

export type HideAction = {
  type: "hide";
  actorId: string;
};

export type HelpAction = {
  type: "help";
  helperId: string;
  targetId: string;
};

export type ReadyAction = {
  type: "ready";
  actorId: string;
  trigger: string;
  readiedAction: string;
};

export type UseObjectAction = {
  type: "use-object";
  actorId: string;
  description: string;
};

export type Action =
  | AttackAction
  | CastAction
  | DashAction
  | DodgeAction
  | DisengageAction
  | HideAction
  | HelpAction
  | ReadyAction
  | UseObjectAction;
