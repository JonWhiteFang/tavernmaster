type Row = Record<string, unknown>;

function splitColumns(value: string): string[] {
  return value
    .split(",")
    .map((column) => column.trim())
    .filter(Boolean);
}

export class FakeDb {
  private tables = new Map<string, Map<string, Row>>();
  private queueOrder: string[] = [];

  private getTable(name: string): Map<string, Row> {
    const existing = this.tables.get(name);
    if (existing) {
      return existing;
    }
    const created = new Map<string, Row>();
    this.tables.set(name, created);
    return created;
  }

  private getPrimaryKeyColumn(table: string): "id" | "key" {
    return table === "app_settings" ? "key" : "id";
  }

  private getRowKey(table: string, row: Row): string {
    const keyColumn = this.getPrimaryKeyColumn(table);
    const value = row[keyColumn];
    if (typeof value !== "string") {
      throw new Error(`Missing primary key ${keyColumn} for ${table}`);
    }
    return value;
  }

  async select<T>(query: string, params: unknown[] = []): Promise<T> {
    const normalized = query.replace(/\s+/g, " ").trim();

    if (normalized === "SELECT COUNT(*) as count FROM srd_spells") {
      const table = this.getTable("srd_spells");
      return [{ count: table.size }] as unknown as T;
    }

    if (normalized.startsWith("SELECT COUNT(*) as count FROM sync_conflicts")) {
      const table = this.getTable("sync_conflicts");
      let count = 0;
      for (const row of table.values()) {
        if (row.resolved_at == null) {
          count += 1;
        }
      }
      return [{ count }] as unknown as T;
    }

    if (normalized.startsWith("SELECT id, last_pulled_at")) {
      const table = this.getTable("sync_state");
      const id = String(params[0] ?? "");
      const row = table.get(id);
      return (row ? [row] : []) as unknown as T;
    }

    if (normalized.startsWith("SELECT id, entity_type, entity_id, op_type")) {
      const table = this.getTable("sync_queue");
      const limit = Number(params[0] ?? 100);
      const rows: Row[] = [];
      for (const id of this.queueOrder) {
        const row = table.get(id);
        if (!row) {
          continue;
        }
        rows.push(row);
        if (rows.length >= limit) {
          break;
        }
      }
      return rows as unknown as T;
    }

    if (normalized.startsWith("SELECT id FROM sync_queue WHERE id = ?")) {
      const table = this.getTable("sync_queue");
      const id = String(params[0] ?? "");
      return (table.has(id) ? [{ id }] : []) as unknown as T;
    }

    if (normalized.startsWith("SELECT id FROM sync_conflicts WHERE id = ?")) {
      const table = this.getTable("sync_conflicts");
      const id = String(params[0] ?? "");
      const row = table.get(id);
      if (!row || row.resolved_at != null) {
        return [] as unknown as T;
      }
      return [{ id }] as unknown as T;
    }

    if (
      normalized.startsWith("SELECT id, entity_type, entity_id, local_payload_json") &&
      normalized.includes("WHERE id = ?")
    ) {
      const table = this.getTable("sync_conflicts");
      const id = String(params[0] ?? "");
      const row = table.get(id);
      if (!row || row.resolved_at != null) {
        return [] as unknown as T;
      }
      return [row] as unknown as T;
    }

    if (normalized.startsWith("SELECT id, entity_type, entity_id, local_payload_json")) {
      const table = this.getTable("sync_conflicts");
      const limit = Number(params[0] ?? 100);
      const rows: Row[] = [];
      for (const row of table.values()) {
        if (row.resolved_at == null) {
          rows.push(row);
        }
      }
      rows.sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
      return rows.slice(0, limit) as unknown as T;
    }

    const updatedAtMatch = normalized.match(
      /^SELECT updated_at FROM ([a-z_]+) WHERE (id|key) = \? LIMIT 1$/i
    );
    if (updatedAtMatch) {
      const [, tableName] = updatedAtMatch;
      const id = String(params[0] ?? "");
      const table = this.getTable(tableName);
      const row = table.get(id);
      if (!row) {
        return [] as unknown as T;
      }
      return [{ updated_at: row.updated_at }] as unknown as T;
    }

    const selectRowMatch = normalized.match(
      /^SELECT (.+) FROM ([a-z_]+) WHERE (id|key) = \? LIMIT 1$/i
    );
    if (selectRowMatch) {
      const [, columnsRaw, tableName] = selectRowMatch;
      const id = String(params[0] ?? "");
      const table = this.getTable(tableName);
      const row = table.get(id);
      if (!row) {
        return [] as unknown as T;
      }
      const columns = splitColumns(columnsRaw);
      const projected: Row = {};
      for (const column of columns) {
        projected[column] = row[column];
      }
      return [projected] as unknown as T;
    }

    throw new Error(`FakeDb.select unhandled query: ${normalized}`);
  }

  async execute(query: string, params: unknown[] = []): Promise<void> {
    const normalized = query.replace(/\s+/g, " ").trim();

    if (normalized.startsWith("INSERT INTO srd_")) {
      const match = normalized.match(
        /^INSERT INTO (srd_[a-z_]+) \(id, name, data_json, created_at, updated_at\)/i
      );
      if (!match) {
        throw new Error(`FakeDb.execute unhandled SRD insert: ${normalized}`);
      }
      const tableName = match[1];
      const [id, name, data_json, created_at, updated_at] = params as string[];
      const table = this.getTable(tableName);
      table.set(id, { id, name, data_json, created_at, updated_at });
      return;
    }

    if (normalized.startsWith("INSERT INTO sync_state")) {
      const [id, last_pulled_at, last_pushed_at, conflict_count, created_at, updated_at] =
        params as [string, string | null, string | null, number, string, string];
      const table = this.getTable("sync_state");
      table.set(id, { id, last_pulled_at, last_pushed_at, conflict_count, created_at, updated_at });
      return;
    }

    if (normalized.startsWith("UPDATE sync_state")) {
      const [last_pulled_at, last_pushed_at, conflict_count, updated_at, id] = params as [
        string | null,
        string | null,
        number,
        string,
        string
      ];
      const table = this.getTable("sync_state");
      const existing = table.get(id);
      if (!existing) {
        throw new Error(`sync_state missing row ${id}`);
      }
      table.set(id, { ...existing, last_pulled_at, last_pushed_at, conflict_count, updated_at });
      return;
    }

    if (normalized.startsWith("INSERT INTO sync_queue")) {
      const [id, entity_type, entity_id, op_type, payload_json, created_at, updated_at] =
        params as [string, string, string, string, string, string, string];
      const table = this.getTable("sync_queue");
      const exists = table.has(id);
      table.set(id, { id, entity_type, entity_id, op_type, payload_json, created_at, updated_at });
      if (!exists) {
        this.queueOrder.push(id);
      }
      return;
    }

    if (normalized === "DELETE FROM sync_queue WHERE id = ?") {
      const id = String(params[0] ?? "");
      const table = this.getTable("sync_queue");
      table.delete(id);
      this.queueOrder = this.queueOrder.filter((entry) => entry !== id);
      return;
    }

    if (normalized.startsWith("INSERT INTO sync_conflicts")) {
      const [
        id,
        entity_type,
        entity_id,
        local_payload_json,
        remote_payload_json,
        local_updated_at,
        remote_updated_at,
        resolved_at,
        resolution,
        created_at,
        updated_at
      ] = params as [
        string,
        string,
        string,
        string,
        string,
        string | null,
        string | null,
        string | null,
        string | null,
        string,
        string
      ];
      const table = this.getTable("sync_conflicts");
      const existing = table.get(id);
      table.set(id, {
        ...(existing ?? {}),
        id,
        entity_type,
        entity_id,
        local_payload_json,
        remote_payload_json,
        local_updated_at,
        remote_updated_at,
        resolved_at,
        resolution,
        created_at: existing?.created_at ?? created_at,
        updated_at
      });
      return;
    }

    if (normalized.startsWith("UPDATE sync_conflicts")) {
      const [resolved_at, resolution, updated_at, id] = params as [string, string, string, string];
      const table = this.getTable("sync_conflicts");
      const existing = table.get(id);
      if (!existing) {
        throw new Error(`sync_conflicts missing row ${id}`);
      }
      table.set(id, { ...existing, resolved_at, resolution, updated_at });
      return;
    }

    const upsertMatch = normalized.match(
      /^INSERT INTO ([a-z_]+) \((.+)\) VALUES \((.+)\) ON CONFLICT\((id|key)\) DO UPDATE SET /i
    );
    if (upsertMatch) {
      const [, tableName, columnsRaw] = upsertMatch;
      const columns = splitColumns(columnsRaw);
      const row: Row = {};
      columns.forEach((column, index) => {
        row[column] = params[index] === undefined ? null : params[index];
      });
      const table = this.getTable(tableName);
      const id = this.getRowKey(tableName, row);
      const existing = table.get(id) ?? {};
      table.set(id, { ...existing, ...row });
      return;
    }

    throw new Error(`FakeDb.execute unhandled query: ${normalized}`);
  }

  seedRow(tableName: string, row: Row) {
    const table = this.getTable(tableName);
    const id = this.getRowKey(tableName, row);
    table.set(id, row);
  }

  getRow(tableName: string, id: string): Row | null {
    const table = this.getTable(tableName);
    return table.get(id) ?? null;
  }
}
