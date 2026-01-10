import { useCallback, useEffect, useMemo, useState } from "react";
import type { PartyActionProposal } from "../ai/types";
import type { PartyContext } from "../ai/orchestrator";
import { getPartyProposals, validatePartyProposals } from "../ai/orchestrator";
import type { RulesState } from "../rules/types";
import { insertAiLog } from "../data/ai_logs";
import {
  createActionProposals,
  listProposalsByEncounter,
  updateProposalStatus,
  type ProposalStatus
} from "../data/action_proposals";

type ProposalState = PartyActionProposal & {
  id?: string;
  status: ProposalStatus;
  errors: string[];
};

type ProposalStateStatus = "idle" | "loading" | "error" | "ready";

export function usePartyProposals(
  partyContext: PartyContext,
  rulesState: RulesState | null,
  encounterId: string | null
) {
  const [proposalState, setProposalState] = useState<ProposalStateStatus>("idle");
  const [proposalError, setProposalError] = useState<string | null>(null);
  const [proposals, setProposals] = useState<ProposalState[]>([]);

  // Load existing proposals on mount or encounter change
  useEffect(() => {
    if (!encounterId) {
      setProposals([]);
      return;
    }
    void listProposalsByEncounter(encounterId).then((saved) => {
      if (saved.length) {
        setProposals(
          saved.map((p) => ({
            id: p.id,
            characterId: p.characterId,
            summary: p.summary,
            action: (p.payload?.action ?? {
              type: "dodge",
              actorId: p.characterId
            }) as PartyActionProposal["action"],
            rulesRefs: p.rulesRefs,
            risks: (p.payload?.risks as string[]) ?? [],
            alternatives: (p.payload?.alternatives as string[]) ?? [],
            status: p.status,
            errors: (p.payload?.errors as string[]) ?? []
          }))
        );
        setProposalState("ready");
      }
    });
  }, [encounterId]);

  const approvalCounts = useMemo(
    () =>
      proposals.reduce(
        (acc, proposal) => {
          acc[proposal.status] += 1;
          return acc;
        },
        { pending: 0, approved: 0, rejected: 0 }
      ),
    [proposals]
  );

  const generate = useCallback(async () => {
    if (!encounterId) {
      setProposalError("Select an encounter before generating proposals.");
      return;
    }
    setProposalState("loading");
    setProposalError(null);
    try {
      const payload = await getPartyProposals(partyContext);
      if (!payload || !payload.proposals.length) {
        setProposalState("error");
        setProposalError("No proposals returned.");
        setProposals([]);
        return;
      }

      // Log to ai_logs
      await insertAiLog({
        campaignId: partyContext.campaignId,
        sessionId: partyContext.sessionId,
        kind: "party",
        content: JSON.stringify(payload),
        payload: payload as unknown as Record<string, unknown>
      });

      const validated = rulesState ? validatePartyProposals(rulesState, payload) : [];
      const nextProposals = payload.proposals.map((proposal) => {
        const validation = validated.find((entry) => entry.characterId === proposal.characterId);
        return {
          ...proposal,
          status: "pending" as ProposalStatus,
          errors: validation?.errors ?? []
        };
      });

      // Persist to action_proposals
      const saved = await createActionProposals(
        encounterId,
        nextProposals.map((p) => ({
          characterId: p.characterId,
          summary: p.summary,
          rulesRefs: p.rulesRefs,
          payload: {
            action: p.action,
            risks: p.risks,
            alternatives: p.alternatives,
            errors: p.errors
          }
        }))
      );

      setProposals(
        nextProposals.map((p, i) => ({
          ...p,
          id: saved[i].id
        }))
      );
      setProposalState("ready");
    } catch (error) {
      setProposalState("error");
      setProposalError("Failed to generate proposals.");
      console.error(error);
    }
  }, [partyContext, rulesState, encounterId]);

  const persistStatus = useCallback(
    async (index: number, status: ProposalStatus) => {
      setProposals((current) =>
        current.map((proposal, proposalIndex) =>
          proposalIndex === index ? { ...proposal, status } : proposal
        )
      );
      const proposal = proposals[index];
      if (proposal?.id) {
        await updateProposalStatus(proposal.id, status);
      }
    },
    [proposals]
  );

  const approve = useCallback(
    (index: number) => void persistStatus(index, "approved"),
    [persistStatus]
  );

  const reject = useCallback(
    (index: number) => void persistStatus(index, "rejected"),
    [persistStatus]
  );

  const approveAllSafe = useCallback(() => {
    setProposals((current) =>
      current.map((proposal) =>
        proposal.errors.length === 0 ? { ...proposal, status: "approved" } : proposal
      )
    );
    // Persist all safe approvals
    proposals.forEach((proposal) => {
      if (proposal.errors.length === 0 && proposal.id) {
        void updateProposalStatus(proposal.id, "approved");
      }
    });
  }, [proposals]);

  return {
    proposalState,
    proposalError,
    proposals,
    approvalCounts,
    generate,
    approve,
    reject,
    approveAllSafe
  };
}
