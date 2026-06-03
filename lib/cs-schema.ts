/**
 * CSアシスタント ドメインの Zod スキーマと派生型。
 * フェーズ1は画面表示用の静的データのみ（保存・AI連携なし）。
 */

import { z } from "zod";

export const customerPhaseSchema = z.enum([
  "onboarding",
  "adoption",
  "success",
]);
export type CustomerPhase = z.infer<typeof customerPhaseSchema>;

export const customerSchema = z.object({
  id: z.string(),
  name: z.string(),
  phase: customerPhaseSchema,
  contractStartDate: z.string(),
  accountManager: z.string(),
});
export type Customer = z.infer<typeof customerSchema>;

export const customersSchema = z.array(customerSchema);

export const consultationTypeSchema = z.enum(["issue", "action"]);
export type ConsultationType = z.infer<typeof consultationTypeSchema>;

export const consultationSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  date: z.string(),
  type: consultationTypeSchema,
  summary: z.string(),
});
export type Consultation = z.infer<typeof consultationSchema>;

export const consultationsSchema = z.array(consultationSchema);

export const chatRoleSchema = z.enum(["user", "assistant"]);
export type ChatRole = z.infer<typeof chatRoleSchema>;

export const chatMessageSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  role: chatRoleSchema,
  content: z.string(),
  timestamp: z.string().optional(),
});
export type ChatMessage = z.infer<typeof chatMessageSchema>;

export const chatMessagesSchema = z.array(chatMessageSchema);

export const nextActionPrioritySchema = z.enum(["high", "medium", "low"]);
export type NextActionPriority = z.infer<typeof nextActionPrioritySchema>;

export const nextActionSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  label: z.string(),
  priority: nextActionPrioritySchema,
  completed: z.boolean().default(false),
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
