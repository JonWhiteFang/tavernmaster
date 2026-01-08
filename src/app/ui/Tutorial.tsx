import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useContext,
  useLayoutEffect
} from "react";
import type { PropsWithChildren } from "react";
import { usePersistentState } from "../hooks/usePersistentState";
import Button from "./Button";
import { tutorialSteps, tutorialVersion } from "../tutorial/steps";
import type { TutorialStep } from "../tutorial/steps";

type TutorialStatus = "idle" | "active" | "paused" | "skipped" | "completed";

type TutorialState = {
  version: string;
  status: TutorialStatus;
  stepIndex: number;
};

type TutorialContextValue = {
  status: TutorialStatus;
  stepIndex: number;
  totalSteps: number;
  currentStep: TutorialStep | null;
  startTutorial: () => void;
  resumeTutorial: () => void;
  pauseTutorial: () => void;
  skipTutorial: () => void;
  restartTutorial: () => void;
  nextStep: () => void;
  prevStep: () => void;
  resetTutorial: () => void;
};

const defaultState: TutorialState = {
  version: tutorialVersion,
  status: "idle",
  stepIndex: 0
};

const TutorialContext = createContext<TutorialContextValue | undefined>(undefined);

export function TutorialProvider({ children }: PropsWithChildren) {
  const [state, setState] = usePersistentState<TutorialState>("tm.tutorial", defaultState);

  useEffect(() => {
    if (!tutorialSteps.length) {
      return;
    }
    if (state.version !== tutorialVersion) {
      setState({ version: tutorialVersion, status: "idle", stepIndex: 0 });
      return;
    }
    if (state.status === "idle") {
      setState({ ...state, status: "active", stepIndex: 0 });
    }
  }, [state, setState]);

  const totalSteps = tutorialSteps.length;
  const stepIndex = Math.min(Math.max(state.stepIndex, 0), Math.max(totalSteps - 1, 0));
  const currentStep = totalSteps ? tutorialSteps[stepIndex] : null;

  const startTutorial = useCallback(() => {
    if (!tutorialSteps.length) {
      return;
    }
    setState({ version: tutorialVersion, status: "active", stepIndex: 0 });
  }, [setState]);

  const resumeTutorial = useCallback(() => {
    if (state.status === "paused") {
      setState({ ...state, status: "active" });
      return;
    }
    if (state.status === "idle") {
      startTutorial();
    }
  }, [setState, startTutorial, state]);

  const pauseTutorial = useCallback(() => {
    if (state.status !== "active") {
      return;
    }
    setState({ ...state, status: "paused" });
  }, [setState, state]);

  const skipTutorial = useCallback(() => {
    setState({ ...state, status: "skipped" });
  }, [setState, state]);

  const restartTutorial = useCallback(() => {
    setState({ version: tutorialVersion, status: "active", stepIndex: 0 });
  }, [setState]);

  const resetTutorial = useCallback(() => {
    setState({ version: tutorialVersion, status: "idle", stepIndex: 0 });
  }, [setState]);

  const nextStep = useCallback(() => {
    if (totalSteps === 0) {
      return;
    }
    if (stepIndex >= totalSteps - 1) {
      setState({ ...state, status: "completed" });
      return;
    }
    setState({ ...state, stepIndex: stepIndex + 1 });
  }, [setState, state, stepIndex, totalSteps]);

  const prevStep = useCallback(() => {
    if (totalSteps === 0) {
      return;
    }
    setState({ ...state, stepIndex: Math.max(stepIndex - 1, 0) });
  }, [setState, state, stepIndex, totalSteps]);

  useEffect(() => {
    if (state.status !== "active") {
      return;
    }
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        pauseTutorial();
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        nextStep();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nextStep, pauseTutorial, state.status]);

  useEffect(() => {
    if (state.status !== "active" || !currentStep?.advanceOn) {
      return;
    }
    if (currentStep.advanceOn.type === "event") {
      const handleAdvance = () => {
        nextStep();
      };
      window.addEventListener(currentStep.advanceOn.name, handleAdvance);
      return () => window.removeEventListener(currentStep.advanceOn.name, handleAdvance);
    }
  }, [currentStep, nextStep, state.status]);

  const value = useMemo<TutorialContextValue>(
    () => ({
      status: state.status,
      stepIndex,
      totalSteps,
      currentStep,
      startTutorial,
      resumeTutorial,
      pauseTutorial,
      skipTutorial,
      restartTutorial,
      nextStep,
      prevStep,
      resetTutorial
    }),
    [
      currentStep,
      nextStep,
      pauseTutorial,
      prevStep,
      resetTutorial,
      restartTutorial,
      resumeTutorial,
      skipTutorial,
      startTutorial,
      state.status,
      stepIndex,
      totalSteps
    ]
  );

  return (
    <TutorialContext.Provider value={value}>
      {children}
      {state.status === "active" && currentStep ? (
        <TutorialOverlay
          step={currentStep}
          stepIndex={stepIndex}
          totalSteps={totalSteps}
          onNext={nextStep}
          onPrev={prevStep}
          onSkip={skipTutorial}
          onPause={pauseTutorial}
        />
      ) : null}
    </TutorialContext.Provider>
  );
}

export function useTutorial(): TutorialContextValue {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error("useTutorial must be used within TutorialProvider");
  }
  return context;
}

type TargetRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

function TutorialOverlay({
  step,
  stepIndex,
  totalSteps,
  onNext,
  onPrev,
  onSkip,
  onPause
}: {
  step: TutorialStep;
  stepIndex: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onPause: () => void;
}) {
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);

  const getTargetElement = useCallback(() => {
    if (!step.targetId) {
      return null;
    }
    const selector = `[data-tutorial-id="${step.targetId}"]`;
    const element = document.querySelector(selector);
    return element instanceof globalThis.HTMLElement ? element : null;
  }, [step.targetId]);

  const updateTarget = useCallback(() => {
    const element = getTargetElement();
    if (!element) {
      setTargetRect(null);
      return;
    }
    const rect = element.getBoundingClientRect();
    setTargetRect({
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height
    });
  }, [getTargetElement]);

  useLayoutEffect(() => {
    const element = getTargetElement();
    if (!element) {
      setTargetRect(null);
      return;
    }
    const rect = element.getBoundingClientRect();
    if (!isRectInView(rect)) {
      element.scrollIntoView({ behavior: "auto", block: "center", inline: "nearest" });
      globalThis.requestAnimationFrame(updateTarget);
      return;
    }
    setTargetRect({
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height
    });
  }, [getTargetElement, updateTarget]);

  useEffect(() => {
    updateTarget();
    window.addEventListener("resize", updateTarget);
    window.addEventListener("scroll", updateTarget, true);
    return () => {
      window.removeEventListener("resize", updateTarget);
      window.removeEventListener("scroll", updateTarget, true);
    };
  }, [updateTarget]);

  const placement = step.placement ?? (targetRect ? "bottom" : "center");
  const hasTarget = Boolean(targetRect);

  const cardStyle = useMemo(() => {
    if (placement === "center" || !targetRect) {
      return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
    }
    const gap = 16;
    const centerX = targetRect.left + targetRect.width / 2;
    const centerY = targetRect.top + targetRect.height / 2;
    switch (placement) {
      case "top":
        return { top: targetRect.top - gap, left: centerX, transform: "translate(-50%, -100%)" };
      case "left":
        return { top: centerY, left: targetRect.left - gap, transform: "translate(-100%, -50%)" };
      case "right":
        return {
          top: centerY,
          left: targetRect.left + targetRect.width + gap,
          transform: "translate(0, -50%)"
        };
      case "bottom":
      default:
        return {
          top: targetRect.top + targetRect.height + gap,
          left: centerX,
          transform: "translate(-50%, 0)"
        };
    }
  }, [placement, targetRect]);

  return (
    <div className="tutorial-overlay">
      {hasTarget && targetRect ? (
        <div
          className="tutorial-spotlight"
          style={{
            top: targetRect.top,
            left: targetRect.left,
            width: targetRect.width,
            height: targetRect.height
          }}
        />
      ) : null}
      <div className="tutorial-card" style={cardStyle} role="dialog" aria-live="polite">
        <div className="tutorial-progress">
          Step {stepIndex + 1} of {totalSteps}
        </div>
        <div className="tutorial-title">{step.title}</div>
        <div className="tutorial-body">{step.body}</div>
        {!hasTarget && step.targetId ? (
          <div className="tutorial-note">
            Tip: navigate to the highlighted area or skip this step to continue.
          </div>
        ) : null}
        <div className="tutorial-actions">
          <div className="tutorial-nav">
            <Button variant="ghost" onClick={onPrev} disabled={stepIndex === 0}>
              Back
            </Button>
            {!hasTarget && step.targetId ? (
              <Button variant="ghost" onClick={onNext}>
                Skip Step
              </Button>
            ) : null}
          </div>
          <div className="tutorial-nav">
            <Button variant="ghost" onClick={onPause}>
              Pause
            </Button>
            <Button variant="ghost" onClick={onSkip}>
              Skip
            </Button>
            <Button onClick={onNext}>{stepIndex + 1 >= totalSteps ? "Finish" : "Next"}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function isRectInView(rect: globalThis.DOMRect) {
  const viewHeight = window.innerHeight || document.documentElement.clientHeight;
  const viewWidth = window.innerWidth || document.documentElement.clientWidth;
  return rect.top >= 0 && rect.left >= 0 && rect.bottom <= viewHeight && rect.right <= viewWidth;
}
