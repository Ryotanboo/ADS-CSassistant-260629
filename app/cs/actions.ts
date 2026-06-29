"use server";

import { revalidatePath } from "next/cache";
import {
  deleteNextActionById,
  insertChatMessage,
  insertCustomer,
  insertNextAction,
  updateNextActionCompleted,
} from "@/lib/cs-db";
import type { Customer, NextAction, ChatMessage } from "@/lib/cs-schema";

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
