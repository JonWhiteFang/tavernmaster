# Database Migrations

TavernMaster uses SQLite's `PRAGMA user_version` to track schema versions.

## Adding a new migration

1. Create a new file: `NNNN_description.ts` (e.g., `0002_add_campaign_state.ts`)
2. Export a `Migration` object:

```ts
import type { Migration } from "../migrate";

const migration: Migration = {
  version: 2,
  name: "add_campaign_state",
  async up(db) {
    await db.execute(`CREATE TABLE campaign_state (...);`);
  }
};

export default migration;
```

3. Register it in `migrate.ts` by adding to the `migrations` array.

## Rules

- Migrations must be idempotent where possible (use `IF NOT EXISTS`).
- Never modify an existing migration after it ships.
- Test migrations against both fresh DBs and existing DBs.
- Backups are created automatically before each migration runs.
