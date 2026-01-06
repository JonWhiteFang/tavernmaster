import { describe, expect, it } from "vitest";
import { buildSqliteUpsertStatement, getTableSpec } from "./tables";

describe("buildSqliteUpsertStatement", () => {
  it("builds a stable upsert for id-primary tables", () => {
    const sql = buildSqliteUpsertStatement(getTableSpec("campaigns"));
    expect(sql).toContain("INSERT INTO campaigns");
    expect(sql).toContain("ON CONFLICT(id) DO UPDATE");
    expect(sql).toContain("updated_at = excluded.updated_at");
    expect(sql).not.toContain("id = excluded.id");
    expect(sql).not.toContain("created_at = excluded.created_at");
  });

  it("builds a stable upsert for key-primary tables", () => {
    const sql = buildSqliteUpsertStatement(getTableSpec("app_settings"));
    expect(sql).toContain("INSERT INTO app_settings");
    expect(sql).toContain("ON CONFLICT(key) DO UPDATE");
    expect(sql).toContain("value_json = excluded.value_json");
    expect(sql).not.toContain("key = excluded.key");
    expect(sql).not.toContain("created_at = excluded.created_at");
  });
});
