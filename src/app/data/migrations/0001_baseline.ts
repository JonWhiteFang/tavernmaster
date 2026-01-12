import type { Migration } from "../migrate";
import { schemaStatements } from "../schema";

const migration: Migration = {
  version: 1,
  name: "baseline",
  async up(db) {
    for (const statement of schemaStatements) {
      await db.execute(statement);
    }
  }
};

export default migration;
