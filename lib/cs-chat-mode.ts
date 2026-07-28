/**
 * CSチャットのモード状態機械（normal / proposal / presentation）。
 * 履歴上の intent 境界と成果物 kind から、いまのモードを導出する。
 */

export type ChatMode = "normal" | "proposal" | "presentation";

export const PROPOSAL_MODE_EXIT_PREFIX = "提案モードを終了しました";
export const PRESENTATION_MODE_EXIT_PREFIX = "プレゼンモードを終了しました";

type ModeMessage = {
  kind?: string;
  intent?: string;
  role?: string;
  content?: string;
};

function findIntentSessionStartIndex(
  messages: ModeMessage[],
  intent: "proposal" | "presentation",
): number {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message.kind === "intent" && message.intent === intent) {
      return i;
    }
  }
  return -1;
}

function isFacilitatorModeActive(
  messages: ModeMessage[],
  intent: "proposal" | "presentation",
  documentKind: "proposal_document" | "presentation_script",
  exitPrefix: string,
): boolean {
  const start = findIntentSessionStartIndex(messages, intent);
  if (start < 0) return false;

  for (let i = start + 1; i < messages.length; i++) {
    const message = messages[i];
    if (message.kind === documentKind) return false;
    if (
      message.role === "assistant" &&
      typeof message.content === "string" &&
      message.content.startsWith(exitPrefix)
    ) {
      return false;
    }
  }
  return true;
}

export function findProposalSessionStartIndex(messages: ModeMessage[]): number {
  return findIntentSessionStartIndex(messages, "proposal");
}

export function findPresentationSessionStartIndex(
  messages: ModeMessage[],
): number {
  return findIntentSessionStartIndex(messages, "presentation");
}

export function isProposalModeActive(messages: ModeMessage[]): boolean {
  return isFacilitatorModeActive(
    messages,
    "proposal",
    "proposal_document",
    PROPOSAL_MODE_EXIT_PREFIX,
  );
}

export function isPresentationModeActive(messages: ModeMessage[]): boolean {
  return isFacilitatorModeActive(
    messages,
    "presentation",
    "presentation_script",
    PRESENTATION_MODE_EXIT_PREFIX,
  );
}

/** 履歴から現在のチャットモードを導出（同時に2つは立たない前提） */
export function getActiveChatMode(messages: ModeMessage[]): ChatMode {
  if (isPresentationModeActive(messages)) return "presentation";
  if (isProposalModeActive(messages)) return "proposal";
  return "normal";
}
