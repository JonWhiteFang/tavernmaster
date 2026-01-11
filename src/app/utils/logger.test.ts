import { describe, expect, it, vi, beforeEach } from "vitest";
import { logger, setLogLevel } from "./logger";

describe("logger", () => {
  beforeEach(() => {
    vi.spyOn(console, "debug").mockImplementation(() => {});
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    setLogLevel("debug");
  });

  it("logs at each level", () => {
    logger.debug("debug msg");
    logger.info("info msg");
    logger.warn("warn msg");
    logger.error("error msg");

    expect(console.debug).toHaveBeenCalled();
    expect(console.info).toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalled();
    expect(console.error).toHaveBeenCalled();
  });

  it("respects log level threshold", () => {
    setLogLevel("warn");

    logger.debug("debug");
    logger.info("info");
    logger.warn("warn");
    logger.error("error");

    expect(console.debug).not.toHaveBeenCalled();
    expect(console.info).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalled();
    expect(console.error).toHaveBeenCalled();
  });

  it("includes context when provided", () => {
    logger.info("test message", "TestContext");
    expect(console.info).toHaveBeenCalledWith(expect.stringContaining("[TestContext]"));
  });

  it("includes error object in error logs", () => {
    const err = new Error("test error");
    logger.error("failed", err, "Context");
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("failed"), err);
  });
});
