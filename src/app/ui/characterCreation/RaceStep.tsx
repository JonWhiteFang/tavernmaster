import type { Dispatch } from "react";
import type { CharacterCreationAction } from "../../characterCreation/state";
import type { SrdRace, AbilityKey } from "../../characterCreation/types";

type Props = {
  races: SrdRace[];
  selected: SrdRace | null;
  dispatch: Dispatch<CharacterCreationAction>;
};

const formatBonuses = (race: SrdRace): string => {
  const parts = Object.entries(race.abilityBonuses).map(
    ([k, v]) => `${(k as AbilityKey).toUpperCase()} +${v}`
  );
  if (race.bonusChoices) {
    parts.push(`+${race.bonusChoices.value} to ${race.bonusChoices.count} choice(s)`);
  }
  return parts.join(", ") || "None";
};

export default function RaceStep({ races, selected, dispatch }: Props) {
  return (
    <div className="selection-grid">
      {races.map((r) => (
        <button
          key={r.id}
          className={`selection-card ${selected?.id === r.id ? "is-selected" : ""}`}
          onClick={() => dispatch({ type: "SELECT_RACE", race: r })}
        >
          <div className="selection-card-title">{r.name}</div>
          <div className="selection-card-subtitle">Speed: {r.speed} ft</div>
          <div className="selection-card-subtitle">{formatBonuses(r)}</div>
        </button>
      ))}
    </div>
  );
}
