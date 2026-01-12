import { useEffect, useState } from "react";
import {
  vaultStatus,
  vaultInitialize,
  vaultUnlock,
  vaultRewrap,
  vaultLock,
  type VaultStatus
} from "../data/vault";
import { getDatabase } from "../data/db";
import { logger } from "../utils/logger";

type ActionStatus = "idle" | "working" | "success" | "error";

export default function VaultSettings() {
  const [status, setStatus] = useState<VaultStatus | null>(null);
  const [wrappedBundle, setWrappedBundle] = useState<string | null>(null);
  const [passphrase, setPassphrase] = useState("");
  const [newPassphrase, setNewPassphrase] = useState("");
  const [actionStatus, setActionStatus] = useState<ActionStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);

  const loadStatus = async () => {
    try {
      const s = await vaultStatus();
      setStatus(s);
      // Load wrapped bundle from DB if exists
      const db = await getDatabase();
      const rows = await db.select<{ value: string }[]>(
        "SELECT value FROM crypto_meta WHERE key = 'wrapped_data_key'"
      );
      setWrappedBundle(rows[0]?.value ?? null);
    } catch (err) {
      logger.error("Failed to load vault status", err, "VaultSettings");
    }
  };

  useEffect(() => {
    void loadStatus();
  }, []);

  const handleInitialize = async () => {
    if (passphrase.length < 8) {
      setMessage("Passphrase must be at least 8 characters");
      setActionStatus("error");
      return;
    }
    setActionStatus("working");
    setMessage(null);
    try {
      const bundle = await vaultInitialize(passphrase);
      // Store in DB
      const db = await getDatabase();
      await db.execute(
        "INSERT OR REPLACE INTO crypto_meta (key, value) VALUES ('wrapped_data_key', ?)",
        [bundle]
      );
      setWrappedBundle(bundle);
      setPassphrase("");
      setActionStatus("success");
      setMessage("Vault initialized successfully");
      await loadStatus();
    } catch (err) {
      setActionStatus("error");
      setMessage(err instanceof Error ? err.message : "Failed to initialize vault");
    }
  };

  const handleUnlock = async () => {
    if (!wrappedBundle) {
      setMessage("No vault to unlock");
      setActionStatus("error");
      return;
    }
    setActionStatus("working");
    setMessage(null);
    try {
      await vaultUnlock(passphrase, wrappedBundle);
      setPassphrase("");
      setActionStatus("success");
      setMessage("Vault unlocked");
      await loadStatus();
    } catch (err) {
      setActionStatus("error");
      setMessage(err instanceof Error ? err.message : "Failed to unlock vault");
    }
  };

  const handleLock = async () => {
    setActionStatus("working");
    try {
      await vaultLock();
      setActionStatus("success");
      setMessage("Vault locked");
      await loadStatus();
    } catch (err) {
      setActionStatus("error");
      setMessage(err instanceof Error ? err.message : "Failed to lock vault");
    }
  };

  const handleRotate = async () => {
    if (!wrappedBundle) {
      setMessage("No vault to rotate");
      setActionStatus("error");
      return;
    }
    if (newPassphrase.length < 8) {
      setMessage("New passphrase must be at least 8 characters");
      setActionStatus("error");
      return;
    }
    setActionStatus("working");
    setMessage(null);
    try {
      const newBundle = await vaultRewrap(passphrase, newPassphrase, wrappedBundle);
      const db = await getDatabase();
      await db.execute(
        "INSERT OR REPLACE INTO crypto_meta (key, value) VALUES ('wrapped_data_key', ?)",
        [newBundle]
      );
      setWrappedBundle(newBundle);
      setPassphrase("");
      setNewPassphrase("");
      setActionStatus("success");
      setMessage("Passphrase rotated successfully");
    } catch (err) {
      setActionStatus("error");
      setMessage(err instanceof Error ? err.message : "Failed to rotate passphrase");
    }
  };

  if (!status) {
    return (
      <section className="panel">
        <div className="panel-title">Vault Settings</div>
        <div className="panel-body">Loading...</div>
      </section>
    );
  }

  return (
    <section className="panel">
      <div className="panel-title">Vault Settings</div>
      <div className="panel-body">
        <p className="panel-copy">
          The vault protects your campaign data with a passphrase. This allows restoring encrypted
          data on a new device.
        </p>

        <div className="status-row" style={{ marginTop: "1rem" }}>
          <span className="status-chip">
            {wrappedBundle ? "Vault Configured" : "Not Configured"}
          </span>
          <span className="status-chip">{status.has_cached_key ? "Unlocked" : "Locked"}</span>
        </div>

        {message && (
          <div className={`status-chip status-${actionStatus}`} style={{ marginTop: "0.5rem" }}>
            {message}
          </div>
        )}

        <div className="form-grid" style={{ marginTop: "1rem" }}>
          <label className="form-field">
            <span className="form-label">Passphrase</span>
            <input
              className="form-input"
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder="Enter passphrase"
            />
          </label>

          {wrappedBundle && (
            <label className="form-field">
              <span className="form-label">New Passphrase (for rotation)</span>
              <input
                className="form-input"
                type="password"
                value={newPassphrase}
                onChange={(e) => setNewPassphrase(e.target.value)}
                placeholder="Enter new passphrase"
              />
            </label>
          )}
        </div>

        <div className="button-row" style={{ marginTop: "1rem" }}>
          {!wrappedBundle ? (
            <button
              className="primary-button"
              onClick={handleInitialize}
              disabled={actionStatus === "working" || passphrase.length < 8}
            >
              Initialize Vault
            </button>
          ) : (
            <>
              {!status.has_cached_key ? (
                <button
                  className="primary-button"
                  onClick={handleUnlock}
                  disabled={actionStatus === "working" || !passphrase}
                >
                  Unlock
                </button>
              ) : (
                <button
                  className="secondary-button"
                  onClick={handleLock}
                  disabled={actionStatus === "working"}
                >
                  Lock
                </button>
              )}
              <button
                className="secondary-button"
                onClick={handleRotate}
                disabled={actionStatus === "working" || !passphrase || newPassphrase.length < 8}
              >
                Rotate Passphrase
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
