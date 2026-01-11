import { useReducer, useEffect, useState } from "react";
import Modal from "../Modal";
import Button from "../Button";
import {
  reducer,
  initialState,
  canProceed,
  canGoBack,
  type CharacterCreationState,
  type CreationStep
} from "../../characterCreation/state";
import type { SrdClass, SrdRace, SrdBackground } from "../../characterCreation/types";
import type { SrdVersion } from "../../data/srdSync";
import { listSrdClasses, listSrdRaces, listSrdBackgrounds } from "../../data/srdContent";
import AbilityScoresStep from "./AbilityScoresStep";
import ClassStep from "./ClassStep";
import RaceStep from "./RaceStep";
import BackgroundStep from "./BackgroundStep";
import EquipmentStep from "./EquipmentStep";
import ConfirmStep from "./ConfirmStep";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (state: CharacterCreationState) => void;
  rulesetVersion?: SrdVersion;
};

const stepLabels: Record<CreationStep, string> = {
  ability: "Abilities",
  class: "Class",
  race: "Race",
  background: "Background",
  equipment: "Equipment",
  confirm: "Confirm"
};

const stepOrder: CreationStep[] = [
  "ability",
  "class",
  "race",
  "background",
  "equipment",
  "confirm"
];

export default function CharacterCreationModal({
  isOpen,
  onClose,
  onComplete,
  rulesetVersion = "5.1"
}: Props) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [classes, setClasses] = useState<SrdClass[]>([]);
  const [races, setRaces] = useState<SrdRace[]>([]);
  const [backgrounds, setBackgrounds] = useState<SrdBackground[]>([]);

  const isDirty = state.step !== "ability" || state.selectedClass || state.name;

  useEffect(() => {
    if (isOpen) {
      listSrdClasses(rulesetVersion).then(setClasses);
      listSrdRaces(rulesetVersion).then(setRaces);
      listSrdBackgrounds(rulesetVersion).then(setBackgrounds);
    }
  }, [isOpen, rulesetVersion]);

  const handleClose = () => {
    if (isDirty && !window.confirm("Cancel character creation? Your progress will be lost.")) {
      return;
    }
    onClose();
  };

  const handleNext = () => {
    if (state.step === "confirm" && canProceed(state)) {
      onComplete(state);
    } else {
      dispatch({ type: "NEXT_STEP" });
    }
  };

  const handleBack = () => dispatch({ type: "PREV_STEP" });

  const currentIndex = stepOrder.indexOf(state.step);

  const footer = (
    <div className="wizard-nav">
      <Button variant="ghost" onClick={handleBack} disabled={!canGoBack(state)}>
        Back
      </Button>
      <Button onClick={handleNext} disabled={!canProceed(state)}>
        {state.step === "confirm" ? "Create Character" : "Next"}
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      title="Create Character"
      subtitle={stepLabels[state.step]}
      onClose={handleClose}
      footer={footer}
    >
      <div className="wizard-stepper">
        {stepOrder.map((step, i) => (
          <div
            key={step}
            className={`wizard-step ${i === currentIndex ? "is-active" : ""} ${i < currentIndex ? "is-complete" : ""}`}
          >
            {stepLabels[step]}
          </div>
        ))}
      </div>
      {state.step === "ability" && <AbilityScoresStep state={state} dispatch={dispatch} />}
      {state.step === "class" && (
        <ClassStep classes={classes} selected={state.selectedClass} dispatch={dispatch} />
      )}
      {state.step === "race" && (
        <RaceStep races={races} selected={state.selectedRace} dispatch={dispatch} />
      )}
      {state.step === "background" && (
        <BackgroundStep
          backgrounds={backgrounds}
          selected={state.selectedBackground}
          dispatch={dispatch}
        />
      )}
      {state.step === "equipment" && <EquipmentStep selectedClass={state.selectedClass} />}
      {state.step === "confirm" && <ConfirmStep state={state} dispatch={dispatch} />}
    </Modal>
  );
}
