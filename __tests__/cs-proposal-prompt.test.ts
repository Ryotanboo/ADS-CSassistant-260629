import { describe, expect, it } from "vitest";

import {
  findProposalSessionStartIndex,
  getActiveChatMode,
  isPresentationModeActive,
  isProposalModeActive,
} from "@/lib/cs-chat-mode";
import { parseChatMeta } from "@/lib/cs-chat-meta";
import { buildProposalSystemPrompt } from "@/lib/cs-proposal-prompt";
import type { Customer } from "@/lib/cs-schema";

const sampleCustomer: Customer = {
  id: "cust-test",
  name: "株式会社テスト",
  phase: "freeTrial",
  contractStartDate: "2026年1月1日",
  accountManager: "担当CS",
  archived: false,
};

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
    expect(getActiveChatMode(messages)).toBe("proposal");
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

describe("isPresentationModeActive / getActiveChatMode", () => {
  it("activates after presentation intent", () => {
    const messages = [
      {
        kind: "proposal_document" as const,
        role: "assistant" as const,
        content: "【提案】…",
      },
      {
        kind: "intent" as const,
        intent: "presentation",
        role: "user" as const,
        content: "プレゼン開始",
      },
    ];
    expect(isPresentationModeActive(messages)).toBe(true);
    expect(getActiveChatMode(messages)).toBe("presentation");
  });

  it("ends after presentation_script", () => {
    expect(
      isPresentationModeActive([
        {
          kind: "intent",
          intent: "presentation",
          role: "user",
          content: "プレゼン開始",
        },
        {
          kind: "presentation_script",
          role: "assistant",
          content: "【読み上げ原稿】…",
        },
      ]),
    ).toBe(false);
  });
});

describe("buildProposalSystemPrompt", () => {
  it("branches customer and internal formats after audience selection", () => {
    const prompt = buildProposalSystemPrompt(sampleCustomer);

    expect(prompt).toContain("顧客向けフォーマット（audience=customer）");
    expect(prompt).toContain("社内向けフォーマット（audience=internal）");
    expect(prompt).toContain("◎ 次の進め方");
    expect(prompt).toContain("社内文書を顧客向けへ転用しない");
    expect(prompt).toContain(
      "例外: audience=customer の提案文書では、末尾「◎ 次の進め方」の貴社／弊社だけ書いてよい",
    );
  });
});

describe("parseChatMeta presentation gate", () => {
  it("downgrades script without episodePresent to ask", () => {
    const parsed = parseChatMeta(
      `本文\n\n[[meta]]{"mode":"presentation","phase":"script","episodePresent":false}[[/meta]]`,
    );
    expect(parsed.presentation?.phase).toBe("ask");
    expect(parsed.readyToLand).toBe(false);
  });

  it("accepts script when episodePresent is true", () => {
    const parsed = parseChatMeta(
      `【読み上げ原稿】\n\n[[meta]]{"mode":"presentation","phase":"script","episodePresent":true}[[/meta]]`,
    );
    expect(parsed.presentation?.phase).toBe("script");
  });
});
