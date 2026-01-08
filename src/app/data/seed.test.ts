import { describe, expect, it, vi } from "vitest";
import { seedDatabase } from "./seed";
import { getDatabase } from "./db";
import { encryptValue } from "./encryption";

vi.mock("./db", () => ({
  getDatabase: vi.fn()
}));
vi.mock("./encryption", () => ({
  encryptValue: vi.fn()
}));

describe("seedDatabase", () => {
  it("skips seeding when demo data is disabled", async () => {
    const select = vi
      .fn()
      .mockResolvedValueOnce([{ count: 0 }])
      .mockResolvedValueOnce([{ count: 0 }])
      .mockResolvedValueOnce([{ count: 0 }])
      .mockResolvedValueOnce([{ count: 0 }]);
    const execute = vi.fn();
    vi.mocked(getDatabase).mockResolvedValue({ select, execute } as never);

    const result = await seedDatabase();

    expect(result).toEqual({
      created: false,
      campaignId: null,
      sessionId: null,
      characterCount: 0
    });
    expect(execute).not.toHaveBeenCalled();
  });

  it("seeds demo data when enabled and tables are empty", async () => {
    const select = vi
      .fn()
      .mockResolvedValueOnce([{ count: 0 }])
      .mockResolvedValueOnce([{ count: 0 }])
      .mockResolvedValueOnce([{ count: 0 }])
      .mockResolvedValueOnce([{ count: 0 }]);
    const execute = vi.fn();
    vi.mocked(getDatabase).mockResolvedValue({ select, execute } as never);
    vi.mocked(encryptValue).mockImplementation(async (value: string) => `enc:${value}`);
    const uuidSpy = vi.spyOn(crypto, "randomUUID").mockReturnValue("uuid");

    const result = await seedDatabase({ includeDemoData: true });

    expect(result.created).toBe(true);
    expect(result.campaignId).toBe("seed-campaign");
    expect(result.sessionId).toBe("seed-session-1");
    expect(result.characterCount).toBeGreaterThan(0);
    expect(execute).toHaveBeenCalled();
    expect(encryptValue).toHaveBeenCalled();
    uuidSpy.mockRestore();
  });
});
