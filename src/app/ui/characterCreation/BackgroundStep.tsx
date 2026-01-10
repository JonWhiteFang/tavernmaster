import type { Dispatch } from "react";
import type { CharacterCreationAction } from "../../characterCreation/state";
import type { SrdBackground } from "../../characterCreation/types";

type Props = {
  backgrounds: SrdBackground[];
  selected: SrdBackground | null;
  dispatch: Dispatch<CharacterCreationAction>;
};

export default function BackgroundStep({ backgrounds, selected, dispatch }: Props) {
  return (
    <div className="selection-grid">
      {backgrounds.map((b) => (
        <button
          key={b.id}
          className={`selection-card ${selected?.id === b.id ? "is-selected" : ""}`}
          onClick={() => dispatch({ type: "SELECT_BACKGROUND", background: b })}
        >
          <div className="selection-card-title">{b.name}</div>
          <div className="selection-card-subtitle">{b.skillProficiencies.join(", ")}</div>
        </button>
      ))}
    </div>
  );
}
