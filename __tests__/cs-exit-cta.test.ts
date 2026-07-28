import { describe, expect, it } from "vitest";

import { getExitCtaState } from "@/lib/cs-exit-cta";

describe("getExitCtaState", () => {
  it("shows proposal always in normal mode, presentation only with document", () => {
    expect(
      getExitCtaState({
        chatMode: "normal",
        hasPendingActions: false,
        hasProposalDocument: false,
      }),
    ).toEqual({
      showProposal: true,
      proposalEmphasized: false,
      showPresentation: false,
      presentationEmphasized: false,
    });

    expect(
      getExitCtaState({
        chatMode: "normal",
        hasPendingActions: true,
        hasProposalDocument: true,
      }),
    ).toEqual({
      showProposal: true,
      proposalEmphasized: true,
      showPresentation: true,
      presentationEmphasized: true,
    });
  });

  it("hides both CTAs in facilitator modes", () => {
    expect(
      getExitCtaState({
        chatMode: "proposal",
        hasPendingActions: true,
        hasProposalDocument: true,
      }).showProposal,
    ).toBe(false);
    expect(
      getExitCtaState({
        chatMode: "presentation",
        hasPendingActions: true,
        hasProposalDocument: true,
      }).showPresentation,
    ).toBe(false);
  });
});
