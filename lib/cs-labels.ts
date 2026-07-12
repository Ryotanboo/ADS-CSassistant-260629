import {
  type ConsultationType,
  type CustomerPhase,
  type NextActionPriority,
} from "@/lib/cs-schema";

export const CUSTOMER_PHASE_LABELS: Record<CustomerPhase, string> = {
  freeTrial: "FT",
  onboarding: "導入中",
  adoption: "活用定着",
  success: "サクセス済",
  churnRisk: "解約懸念",
};

export const CUSTOMER_PHASE_ORDER = [
  "freeTrial",
  "onboarding",
  "adoption",
  "success",
  "churnRisk",
] as const satisfies readonly CustomerPhase[];

/**
 * 顧客リストの並び順（注意が必要なフェーズを上、サクセス済を下へ）。
 * C案の第1段: グループ見出しは後続。まずは優先度ソートのみ。
 */
export const CUSTOMER_PHASE_LIST_ORDER = [
  "churnRisk",
  "freeTrial",
  "onboarding",
  "adoption",
  "success",
] as const satisfies readonly CustomerPhase[];

export const CUSTOMER_PHASE_LIST_RANK: Record<CustomerPhase, number> =
  Object.fromEntries(
    CUSTOMER_PHASE_LIST_ORDER.map((phase, index) => [phase, index]),
  ) as Record<CustomerPhase, number>;

export const CONSULTATION_TYPE_LABELS: Record<ConsultationType, string> = {
  issue: "課題整理",
  action: "打ち手",
};

export const NEXT_ACTION_PRIORITY_LABELS: Record<NextActionPriority, string> = {
  high: "高",
  medium: "中",
  low: "低",
};
