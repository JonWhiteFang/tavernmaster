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
import { listSrdClasses, listSrdRaces, listSrdBackgrounds } from "../../data/srdContent";
import AbilityScoresStep from "./AbilityScoresStep";
import ClassStep from "./ClassStep";
import RaceStep from "./RaceStep";
import BackgroundStep from "./BackgroundStep";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (state: CharacterCreationState) => void;
};

const stepLabels: Record<CreationStep, string> = {
  ability: "Abilities",
  class: "Class",
  race: "Race",
  background: "Background",
  confirm: "Confirm"
};

const stepOrder: CreationStep[] = ["ability", "class", "race", "background", "confirm"];

export default function CharacterCreationModal({ isOpen, onClose, onComplete }: Props) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [classes, setClasses] = useState<SrdClass[]>([]);
  const [races, setRaces] = useState<SrdRace[]>([]);
  const [backgrounds, setBackgrounds] = useState<SrdBackground[]>([]);

  useEffect(() => {
    if (isOpen) {
      listSrdClasses().then(setClasses);
      listSrdRaces().then(setRaces);
      listSrdBackgrounds().then(setBackgrounds);
    }
  }, [isOpen]);

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
      onClose={onClose}
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
      {state.step === "confirm" && <div className="empty-state">Confirmation step coming soon</div>}
    </Modal>
  );
}
