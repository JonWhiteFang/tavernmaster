import { useCallback, useMemo, useState } from "react";
import type { PartyActionProposal } from "../ai/types";
import type { PartyContext } from "../ai/orchestrator";
import { getPartyProposals, validatePartyProposals } from "../ai/orchestrator";
import type { RulesState } from "../rules/types";

type ProposalStatus = "pending" | "approved" | "rejected";

type ProposalState = PartyActionProposal & {
  status: ProposalStatus;
  errors: string[];
};

type ProposalStateStatus = "idle" | "loading" | "error" | "ready";

export function usePartyProposals(partyContext: PartyContext, rulesState: RulesState | null) {
  const [proposalState, setProposalState] = useState<ProposalStateStatus>("idle");
  const [proposalError, setProposalError] = useState<string | null>(null);
  const [proposals, setProposals] = useState<ProposalState[]>([]);

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
      const validated = rulesState ? validatePartyProposals(rulesState, payload) : [];
      const nextProposals = payload.proposals.map((proposal) => {
        const validation = validated.find((entry) => entry.characterId === proposal.characterId);
        return {
          ...proposal,
          status: "pending" as ProposalStatus,
          errors: validation?.errors ?? []
        };
      });
      setProposals(nextProposals);
      setProposalState("ready");
    } catch (error) {
      setProposalState("error");
      setProposalError("Failed to generate proposals.");
      console.error(error);
    }
  }, [partyContext, rulesState]);

  const updateProposalStatus = useCallback((index: number, status: ProposalStatus) => {
    setProposals((current) =>
      current.map((proposal, proposalIndex) =>
        proposalIndex === index ? { ...proposal, status } : proposal
      )
    );
  }, []);

  const approve = useCallback((index: number) => updateProposalStatus(index, "approved"), [
    updateProposalStatus
  ]);

  const reject = useCallback((index: number) => updateProposalStatus(index, "rejected"), [
    updateProposalStatus
  ]);

  const approveAllSafe = useCallback(() => {
    setProposals((current) =>
      current.map((proposal) =>
        proposal.errors.length === 0 ? { ...proposal, status: "approved" } : proposal
      )
    );
  }, []);

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
