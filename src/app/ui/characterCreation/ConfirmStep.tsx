import type { Dispatch } from "react";
import type {
  CharacterCreationState,
  CharacterCreationAction
} from "../../characterCreation/state";
import { finalAbilityScores } from "../../characterCreation/state";
import { applyRacialBonuses, deriveVitals } from "../../characterCreation/builder";
import { abilityOrder } from "../../rules/characterCreation";

type Props = {
  state: CharacterCreationState;
  dispatch: Dispatch<CharacterCreationAction>;
};

const alignments = [
  "Lawful Good",
  "Neutral Good",
  "Chaotic Good",
  "Lawful Neutral",
  "Neutral",
  "Chaotic Neutral",
  "Lawful Evil",
  "Neutral Evil",
  "Chaotic Evil"
];

export default function ConfirmStep({ state, dispatch }: Props) {
  const baseScores = finalAbilityScores(state);
  const abilities = applyRacialBonuses(baseScores, state.selectedRace);
  const vitals = deriveVitals({
    level: 1,
    srdClass: state.selectedClass,
    race: state.selectedRace,
    scores: abilities
  });

  return (
    <div className="confirm-summary">
      <div className="name-input-section">
        <label className="confirm-label">Character Name</label>
        <input
          type="text"
          className="field-input"
          value={state.name}
          onChange={(e) => dispatch({ type: "SET_NAME", name: e.target.value })}
          placeholder="Enter name..."
        />
      </div>

      <div className="confirm-row">
        <span className="confirm-label">Alignment</span>
        <select
          className="field-select"
          value={state.alignment}
          onChange={(e) => dispatch({ type: "SET_ALIGNMENT", alignment: e.target.value })}
        >
          {alignments.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      <div className="confirm-row">
        <span className="confirm-label">Class</span>
        <span className="confirm-value">{state.selectedClass?.name}</span>
      </div>

      <div className="confirm-row">
        <span className="confirm-label">Race</span>
        <span className="confirm-value">{state.selectedRace?.name}</span>
      </div>

      <div className="confirm-row">
        <span className="confirm-label">Background</span>
        <span className="confirm-value">{state.selectedBackground?.name}</span>
      </div>

      <div className="confirm-row">
        <span className="confirm-label">HP</span>
        <span className="confirm-value">{vitals.hitPointMax}</span>
      </div>

      <div className="confirm-row">
        <span className="confirm-label">AC</span>
        <span className="confirm-value">{vitals.armorClass}</span>
      </div>

      <div className="confirm-row">
        <span className="confirm-label">Speed</span>
        <span className="confirm-value">{vitals.speed} ft</span>
      </div>

      <div className="confirm-row">
        <span className="confirm-label">Abilities</span>
        <span className="confirm-value">
          {abilityOrder.map((a) => `${a.toUpperCase()} ${abilities[a]}`).join(" / ")}
        </span>
      </div>
    </div>
  );
}
