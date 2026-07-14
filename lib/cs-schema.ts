/**
 * CSアシスタント ドメインの Zod スキーマと派生型。
 * フェーズ1は画面表示用の静的データのみ（保存・AI連携なし）。
 */

import { z } from "zod";

export const customerPhaseSchema = z.enum([
  "freeTrial",
  "onboarding",
  "adoption",
  "success",
  "churnRisk",
]);
export type CustomerPhase = z.infer<typeof customerPhaseSchema>;

export const customerSchema = z.object({
  id: z.string(),
  name: z.string(),
  phase: customerPhaseSchema,
  contractStartDate: z.string(),
  accountManager: z.string(),
  ftSummary: z.string().optional(),
  ftSummaryUpdatedAt: z.string().optional(),
  archived: z.boolean().default(false),
});
export type Customer = z.infer<typeof customerSchema>;

export const customersSchema = z.array(customerSchema);

export const chatRoleSchema = z.enum(["user", "assistant"]);
export type ChatRole = z.infer<typeof chatRoleSchema>;

export const nextActionPrioritySchema = z.enum(["high", "medium", "low"]);
export type NextActionPriority = z.infer<typeof nextActionPrioritySchema>;

// chatMessageSchema が参照するため、nextActionPrioritySchema の後に定義する
export const landingCardSchema = z.object({
  summary: z.array(z.string()),
  openQuestions: z.array(z.string()),
  nextActions: z.array(
    z.object({
      label: z.string(),
      priority: nextActionPrioritySchema,
    }),
  ),
});
export type LandingCard = z.infer<typeof landingCardSchema>;

export const conversationIntentSchema = z.enum([
  "perspective",
  "actions",
  "proposal",
]);
export type ConversationIntent = z.infer<typeof conversationIntentSchema>;

export const proposalOptionSchema = z.object({
  id: z.string(),
  label: z.string(),
});
export type ProposalOption = z.infer<typeof proposalOptionSchema>;

export const proposalAudienceSchema = z.enum(["customer", "internal"]);
export type ProposalAudience = z.infer<typeof proposalAudienceSchema>;

/** 提案モードの選択肢付き質問カード（landing の card とは別スキーマ） */
export const proposalQuestionCardSchema = z.object({
  options: z.array(proposalOptionSchema).min(1),
  recommended: z.string().optional(),
  audience: proposalAudienceSchema.optional(),
});
export type ProposalQuestionCard = z.infer<typeof proposalQuestionCardSchema>;

export const chatMessageKindSchema = z.enum([
  "text",
  "landing",
  "intent",
  "proposal_question",
  "proposal_document",
]);
export type ChatMessageKind = z.infer<typeof chatMessageKindSchema>;

export const chatMessageSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  role: chatRoleSchema,
  content: z.string(),
  timestamp: z.string().optional(),
  kind: chatMessageKindSchema.default("text"),
  /** kind === "landing" のときのみ */
  card: landingCardSchema.optional(),
  /** kind === "proposal_question" のときのみ */
  proposalCard: proposalQuestionCardSchema.optional(),
  intent: conversationIntentSchema.optional(),
});
export type ChatMessage = z.infer<typeof chatMessageSchema>;

export const chatMessagesSchema = z.array(chatMessageSchema);

export const consultationTypeSchema = z.enum(["issue", "action"]);
export type ConsultationType = z.infer<typeof consultationTypeSchema>;

export const consultationSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  date: z.string(),
  type: consultationTypeSchema,
  summary: z.string(),
  transcript: z.array(chatMessageSchema).optional(),
  archived: z.boolean().default(false),
});
export type Consultation = z.infer<typeof consultationSchema>;

export const consultationsSchema = z.array(consultationSchema);

export const nextActionSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  label: z.string(),
  priority: nextActionPrioritySchema,
  completed: z.boolean().default(false),
  completedAt: z.string().optional(),
  resultNote: z.string().optional(),
});
export type NextAction = z.infer<typeof nextActionSchema>;

export const nextActionsSchema = z.array(nextActionSchema);

export const workspaceUserSchema = z.object({
  name: z.string(),
});
export type WorkspaceUser = z.infer<typeof workspaceUserSchema>;

export const csWorkspaceSchema = z.object({
  name: z.string(),
  icon: z.string(),
  currentUser: workspaceUserSchema,
});
export type CsWorkspace = z.infer<typeof csWorkspaceSchema>;
