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
import type { Campaign, Session } from "../data/types";
import { listCampaigns } from "../data/campaigns";
import { listSessions } from "../data/sessions";
import { usePersistentState } from "../hooks/usePersistentState";

type AppContextValue = {
  campaigns: Campaign[];
  sessions: Session[];
  activeCampaignId: string | null;
  activeSessionId: string | null;
  activeCampaign: Campaign | null;
  activeSession: Session | null;
  setActiveCampaignId: (id: string | null) => void;
  setActiveSessionId: (id: string | null) => void;
  refreshCampaigns: () => Promise<void>;
  refreshSessions: (campaignId?: string | null) => Promise<void>;
  ensureDefaults: (
    nextCampaigns?: Campaign[],
    nextSessions?: Session[],
    sessionsForCampaignId?: string | null
  ) => void;
};

const AppContext = createContext<AppContextValue | undefined>(undefined);

function areCampaignsEqual(current: Campaign[], next: Campaign[]) {
  if (current === next) {
    return true;
  }
  if (current.length !== next.length) {
    return false;
  }
  return current.every((campaign, index) => {
    const compare = next[index];
    return campaign.id === compare.id && campaign.updatedAt === compare.updatedAt;
  });
}

function areSessionsEqual(current: Session[], next: Session[]) {
  if (current === next) {
    return true;
  }
  if (current.length !== next.length) {
    return false;
  }
  return current.every((session, index) => {
    const compare = next[index];
    return (
      session.id === compare.id &&
      session.campaignId === compare.campaignId &&
      session.updatedAt === compare.updatedAt
    );
  });
}

export function AppProvider({ children }: PropsWithChildren) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [campaignsLoaded, setCampaignsLoaded] = useState(false);
  const [sessionsCampaignId, setSessionsCampaignId] = useState<string | null>(null);
  const [activeCampaignId, setActiveCampaignId] = usePersistentState<string | null>(
    "tm.activeCampaignId",
    null
  );
  const [activeSessionId, setActiveSessionId] = usePersistentState<string | null>(
    "tm.activeSessionId",
    null
  );
  const [hasSelectedCampaign, setHasSelectedCampaign] = usePersistentState(
    "tm.hasSelectedCampaign",
    false
  );
  const [hasSelectedSession, setHasSelectedSession] = usePersistentState(
    "tm.hasSelectedSession",
    false
  );

  const setCampaignId = useCallback(
    (id: string | null) => {
      if (id === activeCampaignId) {
        return;
      }
      setActiveCampaignId(id);
      setHasSelectedCampaign(Boolean(id));
      setActiveSessionId(null);
      setHasSelectedSession(false);
    },
    [
      activeCampaignId,
      setActiveCampaignId,
      setActiveSessionId,
      setHasSelectedCampaign,
      setHasSelectedSession
    ]
  );

  const setSessionId = useCallback(
    (id: string | null) => {
      if (id === activeSessionId) {
        return;
      }
      setActiveSessionId(id);
      setHasSelectedSession(Boolean(id));
    },
    [activeSessionId, setActiveSessionId, setHasSelectedSession]
  );

  const ensureDefaults = useCallback(
    (
      nextCampaigns?: Campaign[],
      nextSessions?: Session[],
      sessionsForCampaignId?: string | null
    ) => {
      const campaignsToUse = nextCampaigns ?? campaigns;
      const sessionsToUse = nextSessions ?? sessions;
      const resolvedCampaignsLoaded = nextCampaigns !== undefined || campaignsLoaded;
      const resolvedSessionsCampaignId = sessionsForCampaignId ?? sessionsCampaignId;

      if (!hasSelectedCampaign) {
        if (activeCampaignId !== null) {
          setActiveCampaignId(null);
        }
        if (activeSessionId !== null) {
          setActiveSessionId(null);
        }
        if (hasSelectedSession) {
          setHasSelectedSession(false);
        }
        return;
      }

      if (!resolvedCampaignsLoaded) {
        return;
      }

      const campaignExists = activeCampaignId
        ? campaignsToUse.some((campaign) => campaign.id === activeCampaignId)
        : false;
      if (!campaignExists) {
        setActiveCampaignId(null);
        setActiveSessionId(null);
        setHasSelectedCampaign(false);
        setHasSelectedSession(false);
        return;
      }

      if (!hasSelectedSession) {
        if (activeSessionId !== null) {
          setActiveSessionId(null);
        }
        return;
      }

      if (resolvedSessionsCampaignId !== activeCampaignId) {
        return;
      }

      const sessionExists = activeSessionId
        ? sessionsToUse.some((session) => session.id === activeSessionId)
        : false;
      if (!sessionExists) {
        setActiveSessionId(null);
        setHasSelectedSession(false);
      }
    },
    [
      activeCampaignId,
      activeSessionId,
      campaigns,
      sessions,
      campaignsLoaded,
      sessionsCampaignId,
      hasSelectedCampaign,
      hasSelectedSession,
      setActiveCampaignId,
      setActiveSessionId,
      setHasSelectedCampaign,
      setHasSelectedSession
    ]
  );

  const refreshCampaigns = useCallback(async () => {
    const data = await listCampaigns();
    setCampaigns((current) => (areCampaignsEqual(current, data) ? current : data));
    setCampaignsLoaded(true);
    ensureDefaults(data);
  }, [ensureDefaults]);

  const refreshSessions = useCallback(
    async (campaignId?: string | null) => {
      const resolvedCampaignId = campaignId === undefined ? activeCampaignId : campaignId;
      if (!resolvedCampaignId) {
        setSessions((current) => (current.length === 0 ? current : []));
        setSessionsCampaignId((current) => (current === null ? current : null));
        setActiveSessionId((current) => (current === null ? current : null));
        setHasSelectedSession((current) => (current ? false : current));
        return;
      }
      const data = await listSessions(resolvedCampaignId);
      setSessions((current) => (areSessionsEqual(current, data) ? current : data));
      setSessionsCampaignId(resolvedCampaignId);
      const campaignsForDefaults = campaignsLoaded ? campaigns : undefined;
      ensureDefaults(campaignsForDefaults, data, resolvedCampaignId);
    },
    [
      activeCampaignId,
      campaigns,
      campaignsLoaded,
      ensureDefaults,
      setActiveSessionId,
      setHasSelectedSession
    ]
  );

  useEffect(() => {
    void refreshCampaigns();
  }, [refreshCampaigns]);

  const refreshSessionsRef = useRef(refreshSessions);

  useEffect(() => {
    refreshSessionsRef.current = refreshSessions;
  }, [refreshSessions]);

  useEffect(() => {
    void refreshSessionsRef.current(activeCampaignId);
  }, [activeCampaignId]);

  const activeCampaign = useMemo(
    () => campaigns.find((campaign) => campaign.id === activeCampaignId) ?? null,
    [campaigns, activeCampaignId]
  );

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) ?? null,
    [sessions, activeSessionId]
  );

  const value = useMemo<AppContextValue>(
    () => ({
      campaigns,
      sessions,
      activeCampaignId,
      activeSessionId,
      activeCampaign,
      activeSession,
      setActiveCampaignId: setCampaignId,
      setActiveSessionId: setSessionId,
      refreshCampaigns,
      refreshSessions,
      ensureDefaults
    }),
    [
      campaigns,
      sessions,
      activeCampaignId,
      activeSessionId,
      activeCampaign,
      activeSession,
      refreshCampaigns,
      refreshSessions,
      ensureDefaults,
      setCampaignId,
      setSessionId
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
