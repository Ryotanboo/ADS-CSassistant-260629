import type { ConversationIntent } from "@/lib/cs-schema";

export const CONVERSATION_INTENT_LABELS: Record<ConversationIntent, string> = {
  perspective: "別の視点を出す",
  actions: "打ち手を考える",
  proposal: "提案を作る",
  presentation: "プレゼンを作る",
};

export const CONVERSATION_INTENT_PROMPTS: Record<ConversationIntent, string> = {
  perspective:
    "進行操作です。行き詰まり時の横移動として、現在の相談についてこれまでと異なる見立てを1つだけ提示してください。whyや追加質問はせず、その見立てがなぜ重要かを簡潔に説明してください。確認段のショートカットです。",
  actions:
    "進行操作です。打ち手の提示段への加速です。追加のwhyや質問はせず、現時点で分かっている情報から打ち手候補を最大2つ提示し、それぞれの狙いを簡潔に説明してください。実行チェックリストの箇条書き化はせず（それは着地カードの役割）、合意を急かさず「どう思うか」を一度聞いてください。",
  proposal:
    "進行操作です。提案作成モードを開始してください。最初の質問として、提案の宛先（顧客向け／社内向け）を選択肢付きで確認してください。",
  presentation:
    "進行操作です。プレゼン作成モードを開始してください。スライドは作らず、読み上げ原稿のための材料集めから始めてください。最初の質問として、話す場とおおよその尺を選択肢付きで確認してください。",
};
