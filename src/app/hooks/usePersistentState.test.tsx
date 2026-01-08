import { describe, expect, it, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePersistentState } from "./usePersistentState";

describe("usePersistentState", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("reads from localStorage when available", () => {
    window.localStorage.setItem("key", JSON.stringify("stored"));

    const { result } = renderHook(() => usePersistentState("key", "default"));

    expect(result.current[0]).toBe("stored");
  });

  it("falls back to initial value on parse errors", () => {
    window.localStorage.setItem("key", "not json");

    const { result } = renderHook(() => usePersistentState("key", "default"));

    expect(result.current[0]).toBe("default");
  });

  it("persists updates to localStorage", () => {
    const { result } = renderHook(() => usePersistentState("key", "default"));

    act(() => {
      result.current[1]("next");
    });

    expect(window.localStorage.getItem("key")).toBe(JSON.stringify("next"));
  });
});
