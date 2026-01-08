import { describe, expect, it } from "vitest";
import { schemaStatements } from "./schema";

describe("schemaStatements", () => {
  it("includes core table definitions", () => {
    expect(schemaStatements.length).toBeGreaterThan(0);
    expect(schemaStatements.some((statement) => statement.includes("CREATE TABLE campaigns"))).toBe(
      true
    );
  });
});
