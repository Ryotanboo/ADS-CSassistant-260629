import { describe, expect, it } from "vitest";

import {
  findProposalSessionStartIndex,
  isProposalModeActive,
} from "@/lib/cs-proposal-prompt";

describe("isProposalModeActive", () => {
  it("returns false when proposal has not started", () => {
    expect(
      isProposalModeActive([
        { kind: "text", role: "user", content: "相談です" },
      ]),
    ).toBe(false);
  });

  it("returns true after proposal intent until document or exit", () => {
    const messages = [
      { kind: "text" as const, role: "user" as const, content: "壁打ち" },
      {
        kind: "intent" as const,
        intent: "proposal",
        role: "user" as const,
        content: "提案開始",
      },
      {
        kind: "proposal_question" as const,
        role: "assistant" as const,
        content: "宛先は？",
      },
    ];
    expect(isProposalModeActive(messages)).toBe(true);
    expect(findProposalSessionStartIndex(messages)).toBe(1);
  });

  it("returns false after proposal_document", () => {
    expect(
      isProposalModeActive([
        {
          kind: "intent",
          intent: "proposal",
          role: "user",
          content: "提案開始",
        },
        {
          kind: "proposal_document",
          role: "assistant",
          content: "【提案】…",
        },
      ]),
    ).toBe(false);
  });

  it("returns false after explicit exit message", () => {
    expect(
      isProposalModeActive([
        {
          kind: "intent",
          intent: "proposal",
          role: "user",
          content: "提案開始",
        },
        {
          kind: "text",
          role: "assistant",
          content: "提案モードを終了しました。通常の相談に戻ります。",
        },
      ]),
    ).toBe(false);
  });
});
