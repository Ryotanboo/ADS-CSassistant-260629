import {
  type ConsultationType,
  type CustomerPhase,
  type NextActionPriority,
} from "@/lib/cs-schema";

export const CUSTOMER_PHASE_LABELS: Record<CustomerPhase, string> = {
  onboarding: "導入中",
  adoption: "活用定着",
  success: "サクセス済",
};

export const CONSULTATION_TYPE_LABELS: Record<ConsultationType, string> = {
  issue: "課題整理",
  action: "打ち手",
};

export const NEXT_ACTION_PRIORITY_LABELS: Record<NextActionPriority, string> = {
  high: "高",
  medium: "中",
  low: "低",
};
