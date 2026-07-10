"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { revalidatePath } from "next/cache";
import {
  archiveConsultationById,
  deleteChatMessagesByIds,
  deleteNextActionById,
  insertConsultation,
  insertChatMessage,
  insertCustomer,
  insertNextAction,
  updateNextActionCompleted,
} from "@/lib/cs-db";
import { buildConsultationSummaryPrompt } from "@/lib/cs-ai-prompt";
import type {
  ChatMessage,
  Consultation,
  Customer,
  NextAction,
} from "@/lib/cs-schema";

function todayLabel() {
  return new Date().toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function fallbackSummary(messages: ChatMessage[]) {
  const firstUserMessage = messages.find((message) => message.role === "user");
  const source = firstUserMessage?.content ?? messages[0]?.content ?? "AI相談";
  const compact = source.replace(/\s+/g, " ").trim();
  return compact.length > 45 ? `${compact.slice(0, 44)}…` : compact;
}

async function summarizeConsultation(
  customer: Customer,
  messages: ChatMessage[],
) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return fallbackSummary(messages);

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(
      buildConsultationSummaryPrompt(customer, messages),
    );
    const summary = result.response.text().replace(/\s+/g, " ").trim();
    if (!summary) return fallbackSummary(messages);
    return summary.length > 45 ? `${summary.slice(0, 44)}…` : summary;
  } catch (err) {
    console.error("[cs/actions] Gemini summary error:", err);
    return fallbackSummary(messages);
  }
}

export async function addCustomerAction(customer: Customer) {
  await insertCustomer(customer);
  revalidatePath("/cs");
}

export async function addNextActionAction(action: NextAction) {
  await insertNextAction(action);
  revalidatePath("/cs");
}

export async function toggleNextActionAction(id: string, completed: boolean) {
  await updateNextActionCompleted(id, completed);
  revalidatePath("/cs");
}

export async function deleteNextActionAction(id: string) {
  await deleteNextActionById(id);
  revalidatePath("/cs");
}

export async function addChatMessageAction(message: ChatMessage) {
  await insertChatMessage(message);
  revalidatePath("/cs");
}

export async function archiveChatSessionAction(
  customer: Customer,
  messages: ChatMessage[],
): Promise<Consultation> {
  if (messages.length === 0) {
    throw new Error("履歴化するチャットがありません");
  }

  const consultation: Consultation = {
    id: `consultation-${Date.now()}`,
    customerId: customer.id,
    date: todayLabel(),
    type: "issue",
    summary: await summarizeConsultation(customer, messages),
    transcript: messages,
    archived: false,
  };

  await insertConsultation(consultation);
  await deleteChatMessagesByIds(messages.map((message) => message.id));
  revalidatePath("/cs");

  return consultation;
}

export async function archiveConsultationAction(id: string) {
  await archiveConsultationById(id);
  revalidatePath("/cs");
}
