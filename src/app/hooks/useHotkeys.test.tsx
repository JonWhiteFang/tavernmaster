import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useHotkeys } from "./useHotkeys";

describe("useHotkeys", () => {
  it("fires handler for matching hotkeys", () => {
    const handler = vi.fn();
    renderHook(() => useHotkeys([{ key: "k", handler }]));

    const event = new globalThis.KeyboardEvent("keydown", { key: "k", cancelable: true });
    const preventSpy = vi.spyOn(event, "preventDefault");
    window.dispatchEvent(event);

    expect(preventSpy).toHaveBeenCalled();
    expect(handler).toHaveBeenCalled();
  });

  it("ignores editable targets", () => {
    const handler = vi.fn();
    renderHook(() => useHotkeys([{ key: "k", handler }]));

    const input = document.createElement("input");
    document.body.appendChild(input);
    const event = new globalThis.KeyboardEvent("keydown", { key: "k", cancelable: true });
    input.dispatchEvent(event);

    expect(handler).not.toHaveBeenCalled();
    document.body.removeChild(input);
  });

  it("requires modifier keys when specified", () => {
    const handler = vi.fn();
    renderHook(() => useHotkeys([{ key: "s", ctrl: true, handler }]));

    window.dispatchEvent(new globalThis.KeyboardEvent("keydown", { key: "s" }));
    window.dispatchEvent(new globalThis.KeyboardEvent("keydown", { key: "s", ctrlKey: true }));

    expect(handler).toHaveBeenCalledTimes(1);
  });
});
