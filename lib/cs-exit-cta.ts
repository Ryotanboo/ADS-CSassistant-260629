/**
 * 提案／プレゼン出口CTAの表示・強調ルール（純関数）。
 */

import type { ChatMode } from "@/lib/cs-chat-mode";

export type ExitCtaState = {
  showProposal: boolean;
  proposalEmphasized: boolean;
  showPresentation: boolean;
  presentationEmphasized: boolean;
};

/**
 * - 提案: 通常モード中は常時表示。未完了NAありで強調
 * - プレゼン: 提案文書があるときだけ表示（黄色アクセント＝emphasized）
 */
export function getExitCtaState(input: {
  chatMode: ChatMode;
  hasPendingActions: boolean;
  hasProposalDocument: boolean;
}): ExitCtaState {
  const { chatMode, hasPendingActions, hasProposalDocument } = input;
  const inFacilitator = chatMode !== "normal";

  return {
    showProposal: !inFacilitator,
    proposalEmphasized: !inFacilitator && hasPendingActions,
    showPresentation: !inFacilitator && hasProposalDocument,
    presentationEmphasized: !inFacilitator && hasProposalDocument,
  };
}
