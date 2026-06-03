import { CsWorkspace } from "@/components/cs/CsWorkspace";
import customersData from "@/data/customers.json";
import consultationsData from "@/data/consultations.json";
import chatMessagesData from "@/data/chat-messages.json";
import nextActionsData from "@/data/next-actions.json";
import workspaceData from "@/data/cs-workspace.json";
import {
  customersSchema,
  consultationsSchema,
  chatMessagesSchema,
  nextActionsSchema,
  csWorkspaceSchema,
} from "@/lib/cs-schema";

export default function CsPage() {
  const customersResult = customersSchema.safeParse(customersData);
  const consultationsResult = consultationsSchema.safeParse(consultationsData);
  const chatResult = chatMessagesSchema.safeParse(chatMessagesData);
  const actionsResult = nextActionsSchema.safeParse(nextActionsData);
  const wsResult = csWorkspaceSchema.safeParse(workspaceData);

  if (
    !customersResult.success ||
    !consultationsResult.success ||
    !chatResult.success ||
    !actionsResult.success ||
    !wsResult.success
  ) {
    const errors = [
      !customersResult.success &&
        `customers.json: ${customersResult.error.issues[0]?.message}`,
      !consultationsResult.success &&
        `consultations.json: ${consultationsResult.error.issues[0]?.message}`,
      !chatResult.success &&
        `chat-messages.json: ${chatResult.error.issues[0]?.message}`,
      !actionsResult.success &&
        `next-actions.json: ${actionsResult.error.issues[0]?.message}`,
      !wsResult.success &&
        `workspace.json: ${wsResult.error.issues[0]?.message}`,
    ].filter(Boolean);
    throw new Error(`データの形式が正しくありません:\n${errors.join("\n")}`);
  }

  return (
    <CsWorkspace
      initialCustomers={customersResult.data}
      initialConsultations={consultationsResult.data}
      initialChatMessages={chatResult.data}
      initialNextActions={actionsResult.data}
      workspace={wsResult.data}
    />
  );
}
