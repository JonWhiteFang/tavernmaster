import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
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
  ensureDefaults: (nextCampaigns?: Campaign[], nextSessions?: Session[]) => void;
};

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: PropsWithChildren) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeCampaignId, setActiveCampaignId] = usePersistentState<string | null>(
    "tm.activeCampaignId",
    null
  );
  const [activeSessionId, setActiveSessionId] = usePersistentState<string | null>(
    "tm.activeSessionId",
    null
  );

  const setCampaignId = useCallback(
    (id: string | null) => {
      if (id === activeCampaignId) {
        return;
      }
      setActiveCampaignId(id);
      setActiveSessionId(null);
    },
    [activeCampaignId, setActiveCampaignId, setActiveSessionId]
  );

  const ensureDefaults = useCallback(
    (nextCampaigns?: Campaign[], nextSessions?: Session[]) => {
      const campaignsToUse = nextCampaigns ?? campaigns;
      const sessionsToUse = nextSessions ?? sessions;

      let nextCampaignId = activeCampaignId;
      if (!nextCampaignId || !campaignsToUse.some((campaign) => campaign.id === nextCampaignId)) {
        nextCampaignId = campaignsToUse[0]?.id ?? null;
        if (nextCampaignId !== activeCampaignId) {
          setCampaignId(nextCampaignId);
        }
      }

      if (!nextCampaignId) {
        if (activeSessionId !== null) {
          setActiveSessionId(null);
        }
        return;
      }

      let nextSessionId = activeSessionId;
      if (!nextSessionId || !sessionsToUse.some((session) => session.id === nextSessionId)) {
        nextSessionId = sessionsToUse[0]?.id ?? null;
        if (nextSessionId !== activeSessionId) {
          setActiveSessionId(nextSessionId);
        }
      }
    },
    [activeCampaignId, activeSessionId, campaigns, sessions, setActiveSessionId, setCampaignId]
  );

  const refreshCampaigns = useCallback(async () => {
    const data = await listCampaigns();
    setCampaigns(data);
    ensureDefaults(data, sessions);
  }, [ensureDefaults, sessions]);

  const refreshSessions = useCallback(
    async (campaignId?: string | null) => {
      const resolvedCampaignId = campaignId ?? activeCampaignId;
      if (!resolvedCampaignId) {
        setSessions([]);
        setActiveSessionId(null);
        return;
      }
      const data = await listSessions(resolvedCampaignId);
      setSessions(data);
      ensureDefaults(campaigns, data);
    },
    [activeCampaignId, campaigns, ensureDefaults, setActiveSessionId]
  );

  useEffect(() => {
    void refreshCampaigns();
  }, [refreshCampaigns]);

  useEffect(() => {
    if (!activeCampaignId) {
      setSessions([]);
      setActiveSessionId(null);
      return;
    }
    void refreshSessions(activeCampaignId);
  }, [activeCampaignId, refreshSessions, setActiveSessionId]);

  const activeCampaign = useMemo(
    () => campaigns.find((campaign) => campaign.id === activeCampaignId) ?? campaigns[0] ?? null,
    [campaigns, activeCampaignId]
  );

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) ?? sessions[0] ?? null,
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
      setActiveSessionId,
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
      setActiveSessionId
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
