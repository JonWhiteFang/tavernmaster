import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { PropsWithChildren } from "react";
import { subscribeSyncStatus } from "../sync/client";

type ToastTone = "success" | "error" | "info";

type Toast = {
  id: string;
  message: string;
  tone: ToastTone;
};

type ToastInput = {
  message: string;
  tone?: ToastTone;
};

type ToastContextValue = {
  pushToast: (toast: ToastInput) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);
const toastTimeoutMs = 4200;

export function ToastProvider({ children }: PropsWithChildren) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timeoutsRef = useRef<Map<string, number>>(new Map());
  const syncSeenRef = useRef(false);
  const lastSyncStatus = useRef<string | null>(null);
  const lastSyncMessage = useRef<string | null>(null);

  const removeToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timeout = timeoutsRef.current.get(id);
    if (timeout) {
      window.clearTimeout(timeout);
      timeoutsRef.current.delete(id);
    }
  }, []);

  const pushToast = useCallback(
    ({ message, tone = "info" }: ToastInput) => {
      const id = crypto.randomUUID();
      setToasts((current) => [...current, { id, message, tone }]);
      const timeout = window.setTimeout(() => removeToast(id), toastTimeoutMs);
      timeoutsRef.current.set(id, timeout);
    },
    [removeToast]
  );

  useEffect(() => {
    return subscribeSyncStatus((status, message) => {
      if (!syncSeenRef.current) {
        syncSeenRef.current = true;
        lastSyncStatus.current = status;
        lastSyncMessage.current = message;
        return;
      }

      const wasSyncing = lastSyncStatus.current === "syncing";
      const wasPushing = lastSyncMessage.current === "Pushing changes...";

      if (status === "error") {
        pushToast({ tone: "error", message: message ?? "Sync error." });
      }

      if (status === "offline" && message) {
        pushToast({ tone: "error", message });
      }

      if (status === "idle" && wasSyncing && wasPushing) {
        pushToast({ tone: "success", message: "Sync complete." });
      }

      lastSyncStatus.current = status;
      lastSyncMessage.current = message;
    });
  }, [pushToast]);

  useEffect(() => {
    return () => {
      for (const timeout of timeoutsRef.current.values()) {
        window.clearTimeout(timeout);
      }
      timeoutsRef.current.clear();
    };
  }, []);

  const value = useMemo(() => ({ pushToast }), [pushToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastStack toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}

function ToastStack({
  toasts,
  onDismiss
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div className="toast-stack" aria-live="polite">
      {toasts.map((toast) => (
        <div className={`toast toast-${toast.tone}`} key={toast.id} role="status">
          <span>{toast.message}</span>
          <button
            className="toast-dismiss"
            type="button"
            aria-label="Dismiss notification"
            onClick={() => onDismiss(toast.id)}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
