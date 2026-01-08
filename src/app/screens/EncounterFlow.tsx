import { useEffect, useMemo, useState } from "react";
import type { Character } from "../data/types";
import { listCharacters } from "../data/characters";
import {
  clearEncounterRecovery,
  loadEncounterRecovery,
  saveEncounterRecovery
} from "../data/encounter_recovery";
import { advanceTurn, buildTurnOrder, rollInitiative, startEncounter } from "../rules/initiative";
import { applyEffects } from "../rules/effects";
import { createSeededRng } from "../rules/rng";
import { resolveAction } from "../rules/actions";
import type { RulesState, RulesParticipant } from "../rules/types";
import Button from "../ui/Button";
import Chip from "../ui/Chip";
import { useAppContext } from "../state/AppContext";

const demoAction = {
  type: "attack",
  attackerId: "",
  targetId: "",
  attackBonus: 5,
  damage: "1d8+3",
  damageType: "slashing",
  isMelee: true
} as const;

export default function EncounterFlow() {
  const { activeCampaignId } = useAppContext();
  const [rulesState, setRulesState] = useState<RulesState | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [rngSeed, setRngSeed] = useState(42);
  const [loadedRecovery, setLoadedRecovery] = useState(false);

  useEffect(() => {
    let isMounted = true;
    void (async () => {
      const recovery = await loadEncounterRecovery();
      if (!isMounted) {
        return;
      }
      if (recovery) {
        setRulesState(recovery.rulesState);
        setLog(recovery.log);
        setRngSeed(recovery.rngSeed);
        setLoadedRecovery(true);
        return;
      }

      const characters = await listCharacters();
      if (!isMounted || !characters.length) {
        return;
      }
      const state = buildRulesState(characters);
      setRulesState(state);
      setLog([]);
      setLoadedRecovery(false);
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!rulesState) {
      return;
    }
    void saveEncounterRecovery({ rulesState, log, rngSeed }).catch((error) => {
      console.error("Failed to save encounter recovery snapshot.", error);
    });
  }, [rulesState, log, rngSeed]);

  useEffect(() => {
    const detail = rulesState ? buildEncounterSummary(rulesState) : null;
    window.dispatchEvent(new globalThis.CustomEvent("tm.encounter.summary", { detail }));
  }, [rulesState]);

  const turnOrder = useMemo(() => {
    if (!rulesState) {
      return [];
    }
    return rulesState.turnOrder.map((id) => rulesState.participants[id]);
  }, [rulesState]);

  const activeParticipant = useMemo(() => {
    if (!rulesState || rulesState.turnOrder.length === 0) {
      return null;
    }
    return rulesState.participants[rulesState.turnOrder[rulesState.activeTurnIndex]] ?? null;
  }, [rulesState]);

  const handleRollInitiative = () => {
    if (!rulesState) {
      return;
    }
    const rng = createSeededRng(rngSeed);
    const participants = Object.values(rulesState.participants);
    const rolls = rollInitiative(participants, rng);
    const order = buildTurnOrder(rolls);
    const nameLookup = new Map(
      participants.map((participant) => [participant.id, participant.name])
    );
    setRulesState({
      ...rulesState,
      turnOrder: order,
      activeTurnIndex: 0
    });
    setLog((current) => [
      "Initiative rolled:",
      ...rolls.map((roll) => `${nameLookup.get(roll.participantId)}: ${roll.total}`),
      ...current
    ]);
  };

  const handleStartEncounter = () => {
    if (!rulesState) {
      return;
    }
    const rng = createSeededRng(rngSeed);
    const result = startEncounter(rulesState, rng);
    setRulesState(result.state);
    setLog((current) => [
      "Encounter started.",
      ...result.rolls.map((roll) => `${roll.label}: ${roll.total}`),
      ...current
    ]);
  };

  const handleAdvanceTurn = () => {
    if (!rulesState) {
      return;
    }
    setRulesState((current) => (current ? advanceTurn(current) : current));
  };

  const handleResolveDemo = () => {
    if (!rulesState || rulesState.turnOrder.length < 2) {
      return;
    }
    const rng = createSeededRng(rngSeed);
    const attackerId = rulesState.turnOrder[0];
    const targetId = rulesState.turnOrder[1];
    const result = resolveAction({ ...demoAction, attackerId, targetId }, rulesState, rng);
    if (result.ok) {
      const nextState = applyEffects(rulesState, result.effects, rng);
      setRulesState(nextState);
      setLog((current) => [...result.log, ...current]);
    }
  };

  const handleStartFresh = async () => {
    try {
      await clearEncounterRecovery();
    } catch (error) {
      console.error("Failed to clear encounter recovery snapshot.", error);
    }

    setLoadedRecovery(false);
    const characters = await listCharacters();
    if (!characters.length) {
      setRulesState(null);
      setLog([]);
      return;
    }

    const state = buildRulesState(characters);
    setRulesState(state);
    setLog([]);
  };

  const handleClearSnapshot = async () => {
    try {
      await clearEncounterRecovery();
      setLoadedRecovery(false);
    } catch (error) {
      console.error("Failed to clear encounter recovery snapshot.", error);
    }
  };

  const handleNavigate = (screen: string) => {
    window.dispatchEvent(new globalThis.CustomEvent("tm.navigate", { detail: { screen } }));
  };

  if (!activeCampaignId) {
    return (
      <div className="encounter">
        <section className="panel">
          <div className="panel-title">Encounter Flow</div>
          <div className="panel-subtitle">
            Create or select a campaign in Campaigns & Sessions to start encounter tracking.
          </div>
          <div className="button-row" style={{ marginTop: "1.2rem" }}>
            <Button onClick={() => handleNavigate("dashboard")}>Open Campaigns & Sessions</Button>
            <Button variant="secondary" onClick={() => handleNavigate("party")}>
              Open Party Sheets
            </Button>
          </div>
        </section>
      </div>
    );
  }

  if (!rulesState) {
    return (
      <div className="encounter">
        <section className="panel">
          <div className="panel-title">Encounter Flow</div>
          <div className="panel-subtitle">
            Create party members to start initiative tracking and combat turns.
          </div>
          <div className="button-row" style={{ marginTop: "1.2rem" }}>
            <Button variant="secondary" onClick={() => handleNavigate("party")}>
              Open Party Sheets
            </Button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="encounter">
      <section className="panel" style={{ marginBottom: "1.4rem" }}>
        <div className="panel-title">Encounter Flow</div>
        <div className="panel-subtitle">
          Initiative order, turn management, and condition tracking for active encounters.
        </div>
      </section>

      <div className="encounter-grid">
        <section className="panel">
          <div className="panel-title">Initiative & Turn Order</div>
          <div className="panel-body">
            <div className="button-row">
              <Button variant="ghost" onClick={handleStartFresh}>
                Start Fresh
              </Button>
              {loadedRecovery ? (
                <Button variant="ghost" onClick={handleClearSnapshot}>
                  Clear Snapshot
                </Button>
              ) : null}
              <Button
                variant="secondary"
                onClick={handleRollInitiative}
                data-tutorial-id="encounter-roll-initiative"
              >
                Roll Initiative
              </Button>
              <Button
                variant="secondary"
                onClick={handleStartEncounter}
                data-tutorial-id="encounter-start-encounter"
              >
                Start Encounter
              </Button>
              <Button onClick={handleAdvanceTurn} data-tutorial-id="encounter-advance-turn">
                Advance Turn
              </Button>
            </div>
            <div className="status-row" style={{ marginTop: "1rem" }}>
              <Chip>Round {rulesState?.round ?? 1}</Chip>
              <Chip>Combatants {turnOrder.length}</Chip>
              {loadedRecovery ? <Chip>Recovery Snapshot Loaded</Chip> : null}
            </div>
            <div className="form-field" style={{ maxWidth: 220 }}>
              <span className="form-label">Seeded RNG</span>
              <input
                className="form-input"
                type="number"
                value={rngSeed}
                onChange={(event) => setRngSeed(Number(event.target.value))}
              />
            </div>

            {activeParticipant ? (
              <div className="turn-active">
                <div className="turn-label">Active Turn</div>
                <div className="turn-name">{activeParticipant.name}</div>
                <div className="turn-subtitle">
                  Round {rulesState?.round ?? 1} · AC {activeParticipant.armorClass}
                </div>
              </div>
            ) : null}

            <div className="turn-list">
              <div className="turn-row turn-row-header">
                <span>#</span>
                <span>Name</span>
                <span>HP</span>
                <span>AC</span>
                <span>Cond</span>
              </div>
              {turnOrder.map((participant, index) => (
                <div
                  key={participant.id}
                  className={`turn-row ${
                    activeParticipant?.id === participant.id ? "is-active" : ""
                  }`}
                >
                  <span>{index + 1}</span>
                  <span>{participant.name}</span>
                  <span>
                    {participant.hp}/{participant.maxHp}
                  </span>
                  <span>{participant.armorClass}</span>
                  <span>{participant.conditions.length}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-title">Combat Actions</div>
          <div className="panel-body">
            <p className="panel-copy">
              Quick-resolve a demo action using the rules engine for verification.
            </p>
            <button className="primary-button" onClick={handleResolveDemo}>
              Resolve Sample Attack
            </button>

            <div className="output-panel" style={{ marginTop: "1.2rem" }}>
              <div className="panel-subtitle">Combat Log</div>
              <pre className="output-text">
                {log.length ? log.join("\n") : "Awaiting combat events."}
              </pre>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-title">Conditions</div>
          <div className="panel-body">
            <div className="condition-list">
              {turnOrder.length === 0 ? (
                <div className="panel-copy">No combatants loaded.</div>
              ) : (
                turnOrder.map((participant) => (
                  <div key={participant.id} className="condition-row">
                    <div>
                      <div className="condition-name">{participant.name}</div>
                      <div className="condition-meta">Conditions</div>
                    </div>
                    <div className="condition-tags">
                      {participant.conditions.length ? (
                        participant.conditions.map((condition) => (
                          <span className="tag" key={condition.id}>
                            {condition.name}
                          </span>
                        ))
                      ) : (
                        <span className="tag">None</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function buildRulesState(characters: Character[]): RulesState {
  const participants: Record<string, RulesParticipant> = {};
  for (const character of characters) {
    participants[character.id] = {
      id: character.id,
      name: character.name,
      maxHp: character.hitPointMax,
      hp: character.hitPoints,
      armorClass: character.armorClass,
      initiativeBonus: character.initiativeBonus,
      speed: character.speed,
      abilities: character.abilities,
      savingThrows: {},
      proficiencyBonus: getProficiencyBonus(character.level),
      conditions: []
    };
  }

  return {
    round: 1,
    turnOrder: characters.map((character) => character.id),
    activeTurnIndex: 0,
    participants,
    log: []
  };
}

function getProficiencyBonus(level: number): number {
  return Math.floor((level - 1) / 4) + 2;
}

function buildEncounterSummary(state: RulesState) {
  const activeId = state.turnOrder[state.activeTurnIndex];
  const activeName = activeId ? (state.participants[activeId]?.name ?? null) : null;
  const conditionsCount = Object.values(state.participants).reduce(
    (total, participant) => total + participant.conditions.length,
    0
  );
  return {
    round: state.round,
    activeName,
    conditionsCount,
    combatantCount: state.turnOrder.length
  };
}
