import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn()
}));

const noop = () => {};

if (!("matchMedia" in window)) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: noop,
      removeEventListener: noop,
      addListener: noop,
      removeListener: noop,
      dispatchEvent: () => false
    })
  });
}

if (!("ResizeObserver" in globalThis)) {
  class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globalThis.ResizeObserver = ResizeObserver;
}

const HTMLElementRef = globalThis.HTMLElement;
if (HTMLElementRef && !HTMLElementRef.prototype.scrollIntoView) {
  HTMLElementRef.prototype.scrollIntoView = noop;
}

if (!window.open) {
  Object.defineProperty(window, "open", {
    writable: true,
    value: () => ({
      document: {
        open: noop,
        write: noop,
        close: noop
      },
      focus: noop,
      print: noop
    })
  });
}

if (!globalThis.crypto) {
  globalThis.crypto = {
    randomUUID: () => "test-uuid"
  } as unknown as globalThis.Crypto;
} else if (!globalThis.crypto.randomUUID) {
  globalThis.crypto.randomUUID = () => "test-uuid";
}

afterEach(() => {
  vi.clearAllMocks();
});
