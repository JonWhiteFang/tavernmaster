import { beforeEach, describe, expect, it, vi } from "vitest";
import { downloadTextFile, openPrintWindow, toFilename } from "./exports";

describe("export helpers", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("builds safe filenames", () => {
    expect(toFilename("My Notes", "fallback", "md")).toBe("my-notes.md");
    expect(toFilename("  ", "fallback", "md")).toBe("fallback.md");
  });

  it("downloads text files", () => {
    if (!("createObjectURL" in URL)) {
      Object.defineProperty(URL, "createObjectURL", { value: () => "", writable: true });
    }
    if (!("revokeObjectURL" in URL)) {
      Object.defineProperty(URL, "revokeObjectURL", { value: () => {}, writable: true });
    }

    const createObjectUrl = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:demo");
    const revokeObjectUrl = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    const clickSpy = vi
      .spyOn(globalThis.HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});

    downloadTextFile("demo.txt", "Hello", "text/plain");

    expect(createObjectUrl).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeObjectUrl).toHaveBeenCalledWith("blob:demo");
  });

  it("opens print windows", () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => {
      return {
        document: {
          open: vi.fn(),
          write: vi.fn(),
          close: vi.fn()
        },
        focus: vi.fn(),
        print: vi.fn()
      } as unknown as globalThis.Window;
    });

    openPrintWindow("Title", "Content");

    expect(openSpy).toHaveBeenCalled();
  });
});
