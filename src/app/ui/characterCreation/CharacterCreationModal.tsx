import { useReducer } from "react";
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
import AbilityScoresStep from "./AbilityScoresStep";

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
    <div className="wizard-footer">
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
            className={`wizard-step ${i === currentIndex ? "active" : ""} ${i < currentIndex ? "complete" : ""}`}
          >
            <span className="wizard-step-dot" />
            <span className="wizard-step-label">{stepLabels[step]}</span>
          </div>
        ))}
      </div>
      <div className="wizard-content">
        {state.step === "ability" && <AbilityScoresStep state={state} dispatch={dispatch} />}
        {state.step === "class" && <div className="empty-state">Class selection coming soon</div>}
        {state.step === "race" && <div className="empty-state">Race selection coming soon</div>}
        {state.step === "background" && (
          <div className="empty-state">Background selection coming soon</div>
        )}
        {state.step === "confirm" && (
          <div className="empty-state">Confirmation step coming soon</div>
        )}
      </div>
    </Modal>
  );
}
