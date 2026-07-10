import type { ConversationIntent } from "@/lib/cs-schema";

export const CONVERSATION_INTENT_LABELS: Record<ConversationIntent, string> = {
  perspective: "別の視点を出す",
  actions: "打ち手を考える",
};

export const CONVERSATION_INTENT_PROMPTS: Record<ConversationIntent, string> = {
  perspective:
    "進行操作です。現在の相談について、これまでと異なる重要な視点を1つだけ提示してください。新しい質問を増やしすぎず、その視点がなぜ重要かを簡潔に説明してください。",
  actions:
    "進行操作です。追加質問はせず、現時点で分かっている情報から実行可能な打ち手を最大2つ提示し、それぞれの狙いを簡潔に説明してください。",
};
