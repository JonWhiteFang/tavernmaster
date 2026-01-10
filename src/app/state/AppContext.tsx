import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import type { PropsWithChildren } from "react";
import type { Campaign, Encounter, Session } from "../data/types";
import { listCampaigns } from "../data/campaigns";
import { listSessions } from "../data/sessions";
import { listEncounters } from "../data/encounters";
import {
  getUiState,
  setUiState,
  migrateLocalStorageToUiState,
  type UiState
} from "../data/ui_state";

type AppContextValue = {
  campaigns: Campaign[];
  sessions: Session[];
  encounters: Encounter[];
  activeCampaignId: string | null;
  activeSessionId: string | null;
  activeEncounterId: string | null;
  activeCampaign: Campaign | null;
  activeSession: Session | null;
  activeEncounter: Encounter | null;
  setActiveCampaignId: (id: string | null) => void;
  setActiveSessionId: (id: string | null) => void;
  setActiveEncounterId: (id: string | null) => void;
  refreshCampaigns: () => Promise<void>;
  refreshSessions: (campaignId?: string | null) => Promise<void>;
  refreshEncounters: (campaignId?: string | null) => Promise<void>;
};

const AppContext = createContext<AppContextValue | undefined>(undefined);

function areCampaignsEqual(current: Campaign[], next: Campaign[]) {
  if (current === next) return true;
  if (current.length !== next.length) return false;
  return current.every((c, i) => c.id === next[i].id && c.updatedAt === next[i].updatedAt);
}

function areSessionsEqual(current: Session[], next: Session[]) {
  if (current === next) return true;
  if (current.length !== next.length) return false;
  return current.every(
    (s, i) =>
      s.id === next[i].id &&
      s.campaignId === next[i].campaignId &&
      s.updatedAt === next[i].updatedAt
  );
}

function areEncountersEqual(current: Encounter[], next: Encounter[]) {
  if (current === next) return true;
  if (current.length !== next.length) return false;
  return current.every((e, i) => e.id === next[i].id && e.campaignId === next[i].campaignId);
}

export function AppProvider({ children }: PropsWithChildren) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [uiState, setUiStateLocal] = useState<UiState>({
    activeCampaignId: null,
    activeSessionId: null,
    activeEncounterId: null
  });
  const [initialized, setInitialized] = useState(false);
  const [campaignsLoaded, setCampaignsLoaded] = useState(false);

  const persistUiState = useCallback(async (state: UiState) => {
    setUiStateLocal(state);
    await setUiState(state);
  }, []);

  // Initialize: migrate localStorage if needed, then load from SQLite
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const migrated = await migrateLocalStorageToUiState();
      if (cancelled) return;
      if (migrated) {
        await setUiState(migrated);
        setUiStateLocal(migrated);
      } else {
        const stored = await getUiState();
        if (!cancelled) setUiStateLocal(stored);
      }
      if (!cancelled) setInitialized(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setActiveCampaignId = useCallback(
    (id: string | null) => {
      if (id === uiState.activeCampaignId) return;
      void persistUiState({
        activeCampaignId: id,
        activeSessionId: null,
        activeEncounterId: null
      });
    },
    [uiState.activeCampaignId, persistUiState]
  );

  const setActiveSessionId = useCallback(
    (id: string | null) => {
      if (id === uiState.activeSessionId) return;
      void persistUiState({
        ...uiState,
        activeSessionId: id,
        activeEncounterId: null
      });
    },
    [uiState, persistUiState]
  );

  const setActiveEncounterId = useCallback(
    (id: string | null) => {
      if (id === uiState.activeEncounterId) return;
      void persistUiState({ ...uiState, activeEncounterId: id });
    },
    [uiState, persistUiState]
  );

  // Validate and reset invalid IDs
  const validateAndReset = useCallback(
    async (
      loadedCampaigns: Campaign[],
      loadedSessions?: Session[],
      loadedEncounters?: Encounter[]
    ) => {
      let needsUpdate = false;
      const newState = { ...uiState };

      if (
        uiState.activeCampaignId &&
        !loadedCampaigns.some((c) => c.id === uiState.activeCampaignId)
      ) {
        newState.activeCampaignId = null;
        newState.activeSessionId = null;
        newState.activeEncounterId = null;
        needsUpdate = true;
      }

      if (
        loadedSessions &&
        newState.activeSessionId &&
        !loadedSessions.some((s) => s.id === newState.activeSessionId)
      ) {
        newState.activeSessionId = null;
        needsUpdate = true;
      }

      if (
        loadedEncounters &&
        newState.activeEncounterId &&
        !loadedEncounters.some((e) => e.id === newState.activeEncounterId)
      ) {
        newState.activeEncounterId = null;
        needsUpdate = true;
      }

      if (needsUpdate) {
        await persistUiState(newState);
      }
    },
    [uiState, persistUiState]
  );

  const refreshCampaigns = useCallback(async () => {
    const data = await listCampaigns();
    setCampaigns((current) => (areCampaignsEqual(current, data) ? current : data));
    setCampaignsLoaded(true);
    await validateAndReset(data);
  }, [validateAndReset]);

  const refreshSessions = useCallback(
    async (campaignId?: string | null) => {
      const resolvedId = campaignId === undefined ? uiState.activeCampaignId : campaignId;
      if (!resolvedId) {
        setSessions([]);
        return;
      }
      const data = await listSessions(resolvedId);
      setSessions((current) => (areSessionsEqual(current, data) ? current : data));
      if (campaignsLoaded) {
        await validateAndReset(campaigns, data);
      }
    },
    [uiState.activeCampaignId, campaigns, campaignsLoaded, validateAndReset]
  );

  const refreshEncounters = useCallback(
    async (campaignId?: string | null) => {
      const resolvedId = campaignId === undefined ? uiState.activeCampaignId : campaignId;
      if (!resolvedId) {
        setEncounters([]);
        return;
      }
      const data = await listEncounters(resolvedId);
      setEncounters((current) => (areEncountersEqual(current, data) ? current : data));
      if (campaignsLoaded) {
        await validateAndReset(campaigns, sessions, data);
      }
    },
    [uiState.activeCampaignId, campaigns, sessions, campaignsLoaded, validateAndReset]
  );

  // Load campaigns on init
  useEffect(() => {
    if (!initialized) return;
    void refreshCampaigns();
  }, [initialized, refreshCampaigns]);

  // Load sessions when campaign changes
  const refreshSessionsRef = useRef(refreshSessions);
  useEffect(() => {
    refreshSessionsRef.current = refreshSessions;
  }, [refreshSessions]);

  useEffect(() => {
    if (!initialized) return;
    void refreshSessionsRef.current(uiState.activeCampaignId);
  }, [initialized, uiState.activeCampaignId]);

  // Load encounters when campaign changes
  const refreshEncountersRef = useRef(refreshEncounters);
  useEffect(() => {
    refreshEncountersRef.current = refreshEncounters;
  }, [refreshEncounters]);

  useEffect(() => {
    if (!initialized) return;
    void refreshEncountersRef.current(uiState.activeCampaignId);
  }, [initialized, uiState.activeCampaignId]);

  const activeCampaign = useMemo(
    () => campaigns.find((c) => c.id === uiState.activeCampaignId) ?? null,
    [campaigns, uiState.activeCampaignId]
  );

  const activeSession = useMemo(
    () => sessions.find((s) => s.id === uiState.activeSessionId) ?? null,
    [sessions, uiState.activeSessionId]
  );

  const activeEncounter = useMemo(
    () => encounters.find((e) => e.id === uiState.activeEncounterId) ?? null,
    [encounters, uiState.activeEncounterId]
  );

  const value = useMemo<AppContextValue>(
    () => ({
      campaigns,
      sessions,
      encounters,
      activeCampaignId: uiState.activeCampaignId,
      activeSessionId: uiState.activeSessionId,
      activeEncounterId: uiState.activeEncounterId,
      activeCampaign,
      activeSession,
      activeEncounter,
      setActiveCampaignId,
      setActiveSessionId,
      setActiveEncounterId,
      refreshCampaigns,
      refreshSessions,
      refreshEncounters
    }),
    [
      campaigns,
      sessions,
      encounters,
      uiState,
      activeCampaign,
      activeSession,
      activeEncounter,
      setActiveCampaignId,
      setActiveSessionId,
      setActiveEncounterId,
      refreshCampaigns,
      refreshSessions,
      refreshEncounters
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within AppProvider");
  }
  return context;
}
