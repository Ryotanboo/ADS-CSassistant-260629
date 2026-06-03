import {
  type CustomerPhase,
  type ConsultationType,
  type NextActionPriority,
} from "@/lib/cs-schema";

export function phaseBadgeVariant(
  phase: CustomerPhase,
): "phase-onboarding" | "phase-adoption" | "phase-success" {
  const map = {
    onboarding: "phase-onboarding",
    adoption: "phase-adoption",
    success: "phase-success",
  } as const;
  return map[phase];
}

export function consultationBadgeVariant(
  type: ConsultationType,
): "consultation-issue" | "consultation-action" {
  return type === "issue" ? "consultation-issue" : "consultation-action";
}

export function priorityBadgeVariant(
  priority: NextActionPriority,
): "priority-high" | "priority-medium" | "priority-low" {
  const map = {
    high: "priority-high",
    medium: "priority-medium",
    low: "priority-low",
  } as const;
  return map[priority];
}
