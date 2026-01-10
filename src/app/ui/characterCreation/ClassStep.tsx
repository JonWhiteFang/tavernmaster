import type { Dispatch } from "react";
import type { CharacterCreationAction } from "../../characterCreation/state";
import type { SrdClass } from "../../characterCreation/types";

type Props = {
  classes: SrdClass[];
  selected: SrdClass | null;
  dispatch: Dispatch<CharacterCreationAction>;
};

export default function ClassStep({ classes, selected, dispatch }: Props) {
  return (
    <div className="selection-grid">
      {classes.map((c) => (
        <button
          key={c.id}
          className={`selection-card ${selected?.id === c.id ? "is-selected" : ""}`}
          onClick={() => dispatch({ type: "SELECT_CLASS", srdClass: c })}
        >
          <div className="selection-card-title">{c.name}</div>
          <div className="selection-card-subtitle">Hit Die: d{c.hitDie}</div>
        </button>
      ))}
    </div>
  );
}
