import { listDatabaseBackups, restoreDatabase } from "../data/backups";
import { resetDatabaseForRestore } from "../data/db";
import type { MigrationError } from "../data/migrate";
import { useState } from "react";

interface RecoveryProps {
  error: MigrationError;
  onRetry: () => void;
}

export default function Recovery({ error, onRetry }: RecoveryProps) {
  const [status, setStatus] = useState<"idle" | "restoring" | "restored" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const handleRestore = async () => {
    setStatus("restoring");
    setMessage(null);
    try {
      const backups = await listDatabaseBackups();
      if (backups.length === 0) {
        setStatus("error");
        setMessage("No backups available.");
        return;
      }
      await restoreDatabase(backups[0].path);
      resetDatabaseForRestore();
      setStatus("restored");
      setMessage("Database restored. Click Retry to restart.");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Restore failed.");
    }
  };

  return (
    <div className="recovery-screen">
      <section className="panel" style={{ maxWidth: 600, margin: "4rem auto" }}>
        <div className="panel-title">Database Migration Failed</div>
        <div className="panel-body">
          <p className="panel-copy">
            A database upgrade from version {error.fromVersion} to {error.toVersion} failed:
          </p>
          <pre className="panel-copy" style={{ marginTop: "1rem", whiteSpace: "pre-wrap" }}>
            {error.message}
          </pre>
          {error.backupPath && (
            <p className="panel-copy" style={{ marginTop: "1rem" }}>
              A backup was created before the migration: {error.backupPath}
            </p>
          )}
          {message && (
            <p className="panel-copy" style={{ marginTop: "1rem", fontWeight: 500 }}>
              {message}
            </p>
          )}
          <div className="button-row" style={{ marginTop: "1.5rem" }}>
            <button
              className="secondary-button"
              onClick={handleRestore}
              disabled={status === "restoring"}
            >
              {status === "restoring" ? "Restoring..." : "Restore Latest Backup"}
            </button>
            <button className="primary-button" onClick={onRetry}>
              Retry
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
