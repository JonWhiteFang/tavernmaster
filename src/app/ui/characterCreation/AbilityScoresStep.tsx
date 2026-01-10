import type { Dispatch } from "react";
import type {
  CharacterCreationState,
  CharacterCreationAction,
  AbilityMethod
} from "../../characterCreation/state";
import {
  remainingPointBuyPoints,
  unassignedScores,
  finalAbilityScores
} from "../../characterCreation/state";
import { rollAbilityScores, abilityOrder } from "../../rules/characterCreation";
import type { AbilityKey } from "../../characterCreation/types";

type Props = {
  state: CharacterCreationState;
  dispatch: Dispatch<CharacterCreationAction>;
};

const methodLabels: Record<AbilityMethod, string> = {
  standard: "Standard Array",
  pointBuy: "Point Buy",
  rolling: "Roll 4d6"
};

export default function AbilityScoresStep({ state, dispatch }: Props) {
  const handleMethodChange = (method: AbilityMethod) => {
    dispatch({ type: "SET_ABILITY_METHOD", method });
  };

  const handleRoll = () => {
    const scores = rollAbilityScores(Math.random);
    dispatch({ type: "SET_ROLLED_SCORES", scores });
  };

  const handleAssign = (ability: AbilityKey, scoreIndex: number) => {
    dispatch({ type: "ASSIGN_SCORE", ability, scoreIndex });
  };

  const handlePointBuyChange = (ability: AbilityKey, delta: number) => {
    const current = state.pointBuyScores[ability];
    dispatch({ type: "SET_POINT_BUY_SCORE", ability, value: current + delta });
  };

  const scores = finalAbilityScores(state);
  const unassigned = unassignedScores(state);
  const remaining = remainingPointBuyPoints(state);

  return (
    <div className="ability-step">
      <div className="method-picker">
        {(["standard", "pointBuy", "rolling"] as AbilityMethod[]).map((method) => (
          <button
            key={method}
            className={`method-btn ${state.abilityMethod === method ? "active" : ""}`}
            onClick={() => handleMethodChange(method)}
          >
            {methodLabels[method]}
          </button>
        ))}
      </div>

      {state.abilityMethod === "rolling" && (
        <div className="roll-section">
          <button className="secondary-button" onClick={handleRoll}>
            Roll Scores
          </button>
          <div className="rolled-scores">
            {state.rolledScores.map((score, i) => (
              <span key={i} className="rolled-score">
                {score}
              </span>
            ))}
          </div>
        </div>
      )}

      {state.abilityMethod === "pointBuy" && (
        <div className="point-buy-header">
          Points remaining: <strong>{remaining}</strong>
        </div>
      )}

      <div className="ability-grid">
        {abilityOrder.map((ability) => (
          <div key={ability} className="ability-row">
            <span className="ability-label">{ability.toUpperCase()}</span>
            {state.abilityMethod === "pointBuy" ? (
              <div className="point-buy-controls">
                <button
                  className="ghost-button"
                  onClick={() => handlePointBuyChange(ability, -1)}
                  disabled={state.pointBuyScores[ability] <= 8}
                >
                  −
                </button>
                <span className="ability-score">{state.pointBuyScores[ability]}</span>
                <button
                  className="ghost-button"
                  onClick={() => handlePointBuyChange(ability, 1)}
                  disabled={state.pointBuyScores[ability] >= 15 || remaining <= 0}
                >
                  +
                </button>
              </div>
            ) : (
              <select
                className="ability-select"
                value={state.assignments[ability]}
                onChange={(e) => handleAssign(ability, Number(e.target.value))}
              >
                <option value={-1}>—</option>
                {state.rolledScores.map((score, i) => (
                  <option
                    key={i}
                    value={i}
                    disabled={!unassigned.includes(score) && state.assignments[ability] !== i}
                  >
                    {score}
                  </option>
                ))}
              </select>
            )}
            <span className="ability-final">{scores[ability]}</span>
          </div>
        ))}
      </div>

      {state.abilityMethod !== "pointBuy" && unassigned.length > 0 && (
        <div className="unassigned-hint">Unassigned: {unassigned.join(", ")}</div>
      )}
    </div>
  );
}
