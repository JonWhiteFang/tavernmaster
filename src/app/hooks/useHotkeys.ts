import { useEffect } from "react";

type Hotkey = {
  key: string;
  meta?: boolean;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  handler: () => void;
};

function isEditableTarget(target: globalThis.EventTarget | null): boolean {
  if (!(target instanceof globalThis.HTMLElement)) {
    return false;
  }
  if (target.isContentEditable) {
    return true;
  }
  const tagName = target.tagName.toLowerCase();
  return tagName === "input" || tagName === "textarea" || tagName === "select";
}

export function useHotkeys(hotkeys: Hotkey[]) {
  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (isEditableTarget(event.target)) {
        return;
      }
      for (const hotkey of hotkeys) {
        const keyMatches = event.key.toLowerCase() === hotkey.key.toLowerCase();
        if (!keyMatches) {
          continue;
        }
        if (hotkey.meta && !event.metaKey) {
          continue;
        }
        if (hotkey.ctrl && !event.ctrlKey) {
          continue;
        }
        if (hotkey.shift && !event.shiftKey) {
          continue;
        }
        if (hotkey.alt && !event.altKey) {
          continue;
        }
        event.preventDefault();
        hotkey.handler();
        break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hotkeys]);
}
