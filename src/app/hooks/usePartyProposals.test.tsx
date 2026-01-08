import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { usePartyProposals } from "./usePartyProposals";
import type { PartyActionPayload } from "../ai/types";
import type { PartyContext } from "../ai/orchestrator";

vi.mock("../ai/orchestrator", () => ({
  getPartyProposals: vi.fn(),
  validatePartyProposals: vi.fn()
}));

import { getPartyProposals, validatePartyProposals } from "../ai/orchestrator";

const partyContext: PartyContext = {
  campaignId: "camp-1",
  sessionId: "sess-1",
  summary: "summary",
  encounterSummary: "encounter",
  partyRoster: "Aria"
};

const rulesState = {
  round: 1,
  turnOrder: [],
  activeTurnIndex: 0,
  participants: {},
  log: []
};

describe("usePartyProposals", () => {
  const mockGetPartyProposals = vi.mocked(getPartyProposals);
  const mockValidatePartyProposals = vi.mocked(validatePartyProposals);

  beforeEach(() => {
    mockGetPartyProposals.mockReset();
    mockValidatePartyProposals.mockReset();
  });

  it("handles empty proposals", async () => {
    mockGetPartyProposals.mockResolvedValue(null);

    const { result } = renderHook(() => usePartyProposals(partyContext, rulesState));

    await act(async () => {
      await result.current.generate();
    });

    expect(result.current.proposalState).toBe("error");
    expect(result.current.proposalError).toBe("No proposals returned.");
  });

  it("generates proposals and validates them", async () => {
    const payload: PartyActionPayload = {
      proposals: [
        {
          characterId: "char-1",
          summary: "Strike",
          action: { type: "attack" },
          rulesRefs: [],
          risks: [],
          alternatives: []
        },
        {
          characterId: "char-2",
          summary: "Defend",
          action: { type: "dodge" },
          rulesRefs: [],
          risks: [],
          alternatives: []
        }
      ]
    };
    mockGetPartyProposals.mockResolvedValue(payload);
    mockValidatePartyProposals.mockReturnValue([
      {
        characterId: "char-1",
        action: { type: "attack" },
        errors: ["error"]
      },
      {
        characterId: "char-2",
        action: { type: "dodge" },
        errors: []
      }
    ] as never);

    const { result } = renderHook(() => usePartyProposals(partyContext, rulesState));

    await act(async () => {
      await result.current.generate();
    });

    await waitFor(() => expect(result.current.proposalState).toBe("ready"));
    expect(result.current.proposals).toHaveLength(2);
    expect(result.current.proposals[0].errors).toEqual(["error"]);
    expect(result.current.proposals[1].errors).toEqual([]);
    expect(result.current.approvalCounts).toEqual({
      pending: 2,
      approved: 0,
      rejected: 0
    });

    act(() => {
      result.current.approve(1);
      result.current.reject(0);
    });

    expect(result.current.approvalCounts).toEqual({
      pending: 0,
      approved: 1,
      rejected: 1
    });

    act(() => {
      result.current.approveAllSafe();
    });

    expect(result.current.proposals[1].status).toBe("approved");
    expect(result.current.proposals[0].status).toBe("rejected");
  });
});
