/**
 * AI返答末尾の [[meta]]...[[/meta]] を解析する。
 * normal(readyToLand) / proposal / presentation は排他。
 */

import type {
  ProposalAudience,
  ProposalQuestionCard,
  PresentationQuestionCard,
} from "@/lib/cs-schema";

export type ParsedChatMeta = {
  cleanContent: string;
  readyToLand: boolean;
  proposal: {
    phase: "ask" | "document";
    options?: ProposalQuestionCard["options"];
    recommended?: string;
    audience?: ProposalAudience;
  } | null;
  presentation: {
    phase: "ask" | "script";
    options?: PresentationQuestionCard["options"];
    recommended?: string;
    episodePresent: boolean;
  } | null;
};

function parseOptions(
  options: unknown,
): { id: string; label: string }[] | undefined {
  if (!Array.isArray(options)) return undefined;
  const parsed = options
    .filter(
      (option): option is { id: string; label: string } =>
        typeof option === "object" &&
        option != null &&
        typeof (option as { id?: unknown }).id === "string" &&
        typeof (option as { label?: unknown }).label === "string",
    )
    .map((option) => ({ id: option.id, label: option.label }));
  return parsed.length > 0 ? parsed : undefined;
}

export function parseChatMeta(content: string): ParsedChatMeta {
  const metaMatch = content.match(/\[\[meta\]\]([\s\S]*?)\[\[\/meta\]\]/);
  const cleanContent = content
    .replace(/\[\[meta\]\][\s\S]*?\[\[\/meta\]\]/g, "")
    .trimEnd();

  if (!metaMatch) {
    return {
      cleanContent,
      readyToLand: false,
      proposal: null,
      presentation: null,
    };
  }

  try {
    const meta = JSON.parse(metaMatch[1]) as {
      readyToLand?: boolean;
      mode?: string;
      phase?: string;
      options?: unknown;
      recommended?: string;
      audience?: string;
      episodePresent?: boolean;
    };

    if (meta.mode === "proposal") {
      const options = parseOptions(meta.options);
      const audience =
        meta.audience === "customer" || meta.audience === "internal"
          ? meta.audience
          : undefined;

      return {
        cleanContent,
        readyToLand: false,
        proposal: {
          phase: meta.phase === "document" ? "document" : "ask",
          options,
          recommended:
            typeof meta.recommended === "string"
              ? meta.recommended
              : undefined,
          audience,
        },
        presentation: null,
      };
    }

    if (meta.mode === "presentation") {
      const options = parseOptions(meta.options);
      const episodePresent = meta.episodePresent === true;
      // 場面未確認の script は受理せず ask に落とす（創作防止ゲート）
      const wantsScript = meta.phase === "script";
      const phase =
        wantsScript && episodePresent ? ("script" as const) : ("ask" as const);

      return {
        cleanContent,
        readyToLand: false,
        proposal: null,
        presentation: {
          phase,
          options: phase === "ask" ? options : undefined,
          recommended:
            typeof meta.recommended === "string"
              ? meta.recommended
              : undefined,
          episodePresent,
        },
      };
    }

    return {
      cleanContent,
      readyToLand: meta.readyToLand === true,
      proposal: null,
      presentation: null,
    };
  } catch {
    return {
      cleanContent,
      readyToLand: false,
      proposal: null,
      presentation: null,
    };
  }
}

/** ストリーミング中: meta ブロック開始以降を非表示にする */
export function stripPartialMeta(content: string): string {
  return content.replace(/\[\[meta\]\][\s\S]*$/, "").trimEnd();
}
