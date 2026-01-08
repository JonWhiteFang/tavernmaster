import { describe, expect, it, vi } from "vitest";
import * as settingsModule from "./settings";
import { getDatabase } from "./db";
import { enqueueUpsertAndSchedule } from "../sync/ops";
import { getSecret, setSecret } from "../sync/secure";

vi.mock("./db", () => ({
  getDatabase: vi.fn()
}));
vi.mock("../sync/ops", () => ({
  enqueueUpsertAndSchedule: vi.fn()
}));
vi.mock("../sync/secure", () => ({
  getSecret: vi.fn(),
  setSecret: vi.fn()
}));

describe("settings", () => {
  it("returns keychain settings when available", async () => {
    vi.mocked(getSecret).mockResolvedValueOnce(
      JSON.stringify({
        baseUrl: "http://llm.local",
        model: "llama-test",
        temperature: 0.2,
        maxTokens: 500,
        topP: 0.9,
        stream: true
      })
    );

    const result = await settingsModule.getAppSettings();

    expect(result.llm.model).toBe("llama-test");
    expect(getDatabase).not.toHaveBeenCalled();
  });

  it("reads settings from the database and writes to keychain", async () => {
    const select = vi.fn().mockResolvedValue([
      {
        value_json: JSON.stringify({
          llm: {
            baseUrl: "http://db.local",
            model: "db-model",
            temperature: 0.5,
            maxTokens: 123,
            topP: 0.8,
            stream: false
          }
        })
      }
    ]);
    vi.mocked(getSecret).mockResolvedValueOnce(null);
    vi.mocked(getDatabase).mockResolvedValue({ select } as never);

    const result = await settingsModule.getAppSettings();

    expect(result.llm.baseUrl).toBe("http://db.local");
    expect(setSecret).toHaveBeenCalledWith(
      "llm_settings",
      JSON.stringify(result.llm)
    );
  });

  it("upserts settings and enqueues sync", async () => {
    const execute = vi.fn();
    vi.mocked(getDatabase).mockResolvedValue({ execute } as never);
    vi.mocked(setSecret).mockResolvedValue(undefined);

    const settings = {
      llm: {
        baseUrl: "http://example.test",
        model: "my-model",
        temperature: 0.7,
        maxTokens: 900,
        topP: 1,
        stream: true
      }
    };

    await settingsModule.upsertAppSettings(settings);

    expect(execute).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO app_settings"),
      expect.arrayContaining(["app_settings", JSON.stringify(settings)])
    );
    expect(enqueueUpsertAndSchedule).toHaveBeenCalledWith(
      "app_settings",
      "app_settings",
      expect.objectContaining({
        key: "app_settings",
        value_json: JSON.stringify(settings)
      })
    );
  });

  it("creates defaults when settings are missing", async () => {
    const select = vi.fn().mockResolvedValue([]);
    vi.mocked(getSecret).mockResolvedValueOnce(null);
    vi.mocked(getDatabase).mockResolvedValue({ select } as never);
    const upsertSpy = vi
      .spyOn(settingsModule, "upsertAppSettings")
      .mockResolvedValue(undefined);

    const result = await settingsModule.getAppSettings();

    expect(result.llm.baseUrl).toBeTruthy();
    expect(upsertSpy).toHaveBeenCalled();
    upsertSpy.mockRestore();
  });

  it("falls back to defaults on errors", async () => {
    vi.mocked(getSecret).mockResolvedValueOnce(null);
    vi.mocked(getDatabase).mockRejectedValueOnce(new Error("db error"));

    const result = await settingsModule.getAppSettings();

    expect(result.llm.baseUrl).toBeTruthy();
  });
});
