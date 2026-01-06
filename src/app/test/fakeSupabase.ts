type SupabaseError = { message: string };

type FromTable = {
  upsert: (
    row: Record<string, unknown>,
    opts?: { onConflict?: string }
  ) => Promise<{ error: SupabaseError | null }>;
  select: (columns: string) => {
    gt: (
      column: string,
      value: string
    ) => {
      order: (
        column: string,
        opts: { ascending: boolean }
      ) => {
        limit: (
          count: number
        ) => Promise<{ data: Record<string, unknown>[]; error: SupabaseError | null }>;
      };
    };
  };
};

export class FakeSupabaseClient {
  private session: unknown | null = { user: { id: "user" } };
  private remote: Record<string, Record<string, unknown>[]> = {};
  public upserts: Array<{ table: string; row: Record<string, unknown> }> = [];

  setSession(present: boolean) {
    this.session = present ? { user: { id: "user" } } : null;
  }

  setRemoteRows(table: string, rows: Record<string, unknown>[]) {
    this.remote[table] = rows;
  }

  auth = {
    getSession: async () => ({
      data: { session: this.session },
      error: null as SupabaseError | null
    })
  };

  from = (table: string): FromTable => {
    return {
      upsert: async (row) => {
        this.upserts.push({ table, row });
        return { error: null };
      },
      select: (_columns: string) => {
        let since = "1970-01-01T00:00:00.000Z";
        return {
          gt: (_column: string, value: string) => {
            since = value;
            return {
              order: (_orderBy: string, _opts: { ascending: boolean }) => {
                return {
                  limit: async (_count: number) => {
                    const rows = this.remote[table] ?? [];
                    const filtered = rows.filter((row) => {
                      const updatedAt = row.updated_at;
                      return typeof updatedAt === "string" ? updatedAt > since : true;
                    });
                    return { data: filtered, error: null };
                  }
                };
              }
            };
          }
        };
      }
    };
  };
}
