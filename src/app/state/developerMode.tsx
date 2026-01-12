import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getDatabase } from "../data/db";

interface DeveloperModeContextValue {
  developerMode: boolean;
  setDeveloperMode: (enabled: boolean) => Promise<void>;
}

const DeveloperModeContext = createContext<DeveloperModeContextValue>({
  developerMode: false,
  setDeveloperMode: async () => {}
});

export function useDeveloperMode() {
  return useContext(DeveloperModeContext);
}

export function DeveloperModeProvider({ children }: { children: ReactNode }) {
  const [developerMode, setDeveloperModeState] = useState(false);

  useEffect(() => {
    void loadSetting();
  }, []);

  const loadSetting = async () => {
    try {
      const db = await getDatabase();
      const rows = await db.select<{ value: string }[]>(
        "SELECT value FROM app_settings WHERE key = 'developer_mode'"
      );
      setDeveloperModeState(rows[0]?.value === "true");
    } catch {
      // Default to false
    }
  };

  const setDeveloperMode = async (enabled: boolean) => {
    const db = await getDatabase();
    await db.execute(
      `INSERT INTO app_settings (key, value) VALUES ('developer_mode', ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      [enabled ? "true" : "false"]
    );
    setDeveloperModeState(enabled);
  };

  return (
    <DeveloperModeContext.Provider value={{ developerMode, setDeveloperMode }}>
      {children}
    </DeveloperModeContext.Provider>
  );
}
