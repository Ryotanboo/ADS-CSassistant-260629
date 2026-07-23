/**
 * CSアシスタント DB層
 * Neon Serverless (PostgreSQL) への接続と各テーブルの CRUD 関数。
 *
 * テーブル設計の方針:
 * - DB に置く: customers / next_actions / chat_messages
 *   → 実行時にユーザーが作るデータ。リロード・別端末で同じ状態が必要。
 * - リポジトリに残す: data/cs-workspace.json / lib/cs-labels.ts / lib/cs-ai-prompt.ts
 *   → 設定・ルール・プロンプト定義。AIから直接読める場所に置く。
 */

import { neon } from "@neondatabase/serverless";
import {
  landingCardSchema,
  proposalQuestionCardSchema,
  type ChatMessage,
  type Consultation,
  type Customer,
  type NextAction,
  type WorkspaceUser,
} from "@/lib/cs-schema";

function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL が設定されていません");
  return neon(url);
}

// ─────────────────────────────────────────────
// テーブル初期化
// ─────────────────────────────────────────────

export async function initTables() {
  const sql = getDb();
  await sql`
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phase TEXT NOT NULL,
      contract_start_date TEXT NOT NULL,
      account_manager TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS next_actions (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      label TEXT NOT NULL,
      priority TEXT NOT NULL,
      completed BOOLEAN DEFAULT FALSE,
      completed_at TEXT,
      result_note TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      timestamp TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS consultations (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      type TEXT NOT NULL,
      summary TEXT NOT NULL,
      transcript JSONB,
      archived BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`
    ALTER TABLE consultations
    ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE
  `;
  await sql`
    ALTER TABLE chat_messages
    ADD COLUMN IF NOT EXISTS kind TEXT DEFAULT 'text'
  `;
  await sql`
    ALTER TABLE chat_messages
    ADD COLUMN IF NOT EXISTS card JSONB
  `;
  await sql`
    ALTER TABLE chat_messages
    ADD COLUMN IF NOT EXISTS intent TEXT
  `;
  await sql`
    ALTER TABLE customers
    ADD COLUMN IF NOT EXISTS ft_summary TEXT
  `;
  await sql`
    ALTER TABLE customers
    ADD COLUMN IF NOT EXISTS ft_summary_updated_at TEXT
  `;
  await sql`
    ALTER TABLE customers
    ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE
  `;
  await sql`
    ALTER TABLE next_actions
    ADD COLUMN IF NOT EXISTS completed_at TEXT
  `;
  await sql`
    ALTER TABLE next_actions
    ADD COLUMN IF NOT EXISTS result_note TEXT
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS cs_settings (
      id TEXT PRIMARY KEY,
      user_name TEXT NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
}

// ─────────────────────────────────────────────
// customers
// ─────────────────────────────────────────────

export async function getCustomers(): Promise<Customer[]> {
  const sql = getDb();
  const rows = await sql`
    SELECT
      id,
      name,
      phase,
      contract_start_date,
      account_manager,
      ft_summary,
      ft_summary_updated_at,
      archived
    FROM customers
    ORDER BY created_at ASC
  `;
  return rows.map((r) => ({
    id: r.id as string,
    name: r.name as string,
    phase: r.phase as Customer["phase"],
    contractStartDate: r.contract_start_date as string,
    accountManager: r.account_manager as string,
    ftSummary: r.ft_summary != null ? (r.ft_summary as string) : undefined,
    ftSummaryUpdatedAt:
      r.ft_summary_updated_at != null
        ? (r.ft_summary_updated_at as string)
        : undefined,
    archived: r.archived === true,
  }));
}

export async function insertCustomer(c: Customer): Promise<void> {
  const sql = getDb();
  await sql`
    INSERT INTO customers (
      id,
      name,
      phase,
      contract_start_date,
      account_manager,
      ft_summary,
      ft_summary_updated_at,
      archived
    )
    VALUES (
      ${c.id},
      ${c.name},
      ${c.phase},
      ${c.contractStartDate},
      ${c.accountManager},
      ${c.ftSummary ?? null},
      ${c.ftSummaryUpdatedAt ?? null},
      ${c.archived ?? false}
    )
    ON CONFLICT (id) DO NOTHING
  `;
}

export async function updateCustomerArchived(
  customerId: string,
  archived: boolean,
): Promise<void> {
  const sql = getDb();
  await sql`
    UPDATE customers
    SET archived = ${archived}
    WHERE id = ${customerId}
  `;
}

export type CustomerProfilePatch = {
  name?: string;
  phase?: Customer["phase"];
  contractStartDate?: string;
  accountManager?: string;
};

export async function updateCustomerProfile(
  customerId: string,
  patch: CustomerProfilePatch,
): Promise<void> {
  const sql = getDb();
  if (patch.name !== undefined) {
    await sql`
      UPDATE customers
      SET name = ${patch.name}
      WHERE id = ${customerId}
    `;
  }
  if (patch.phase !== undefined) {
    await sql`
      UPDATE customers
      SET phase = ${patch.phase}
      WHERE id = ${customerId}
    `;
  }
  if (patch.contractStartDate !== undefined) {
    await sql`
      UPDATE customers
      SET contract_start_date = ${patch.contractStartDate}
      WHERE id = ${customerId}
    `;
  }
  if (patch.accountManager !== undefined) {
    await sql`
      UPDATE customers
      SET account_manager = ${patch.accountManager}
      WHERE id = ${customerId}
    `;
  }
}

export async function deleteCustomerById(customerId: string): Promise<void> {
  const sql = getDb();
  await sql`DELETE FROM customers WHERE id = ${customerId}`;
}

export async function updateCustomerFtSummary(
  customerId: string,
  ftSummary: string,
  updatedAt: string,
): Promise<void> {
  const sql = getDb();
  await sql`
    UPDATE customers
    SET
      ft_summary = ${ftSummary},
      ft_summary_updated_at = ${updatedAt}
    WHERE id = ${customerId}
  `;
}

// ─────────────────────────────────────────────
// next_actions
// ─────────────────────────────────────────────

export async function getNextActions(
  customerId: string,
): Promise<NextAction[]> {
  const sql = getDb();
  const rows = await sql`
    SELECT
      id,
      customer_id,
      label,
      priority,
      completed,
      completed_at,
      result_note
    FROM next_actions
    WHERE customer_id = ${customerId}
    ORDER BY created_at ASC
  `;
  return rows.map((r) => ({
    id: r.id as string,
    customerId: r.customer_id as string,
    label: r.label as string,
    priority: r.priority as NextAction["priority"],
    completed: r.completed as boolean,
    completedAt:
      r.completed_at != null ? (r.completed_at as string) : undefined,
    resultNote: r.result_note != null ? (r.result_note as string) : undefined,
  }));
}

export async function getAllNextActions(): Promise<NextAction[]> {
  const sql = getDb();
  const rows = await sql`
    SELECT
      id,
      customer_id,
      label,
      priority,
      completed,
      completed_at,
      result_note
    FROM next_actions
    ORDER BY created_at ASC
  `;
  return rows.map((r) => ({
    id: r.id as string,
    customerId: r.customer_id as string,
    label: r.label as string,
    priority: r.priority as NextAction["priority"],
    completed: r.completed as boolean,
    completedAt:
      r.completed_at != null ? (r.completed_at as string) : undefined,
    resultNote: r.result_note != null ? (r.result_note as string) : undefined,
  }));
}

export async function insertNextAction(a: NextAction): Promise<void> {
  const sql = getDb();
  await sql`
    INSERT INTO next_actions (
      id,
      customer_id,
      label,
      priority,
      completed,
      completed_at,
      result_note
    )
    VALUES (
      ${a.id},
      ${a.customerId},
      ${a.label},
      ${a.priority},
      ${a.completed},
      ${a.completedAt ?? null},
      ${a.resultNote ?? null}
    )
    ON CONFLICT (id) DO NOTHING
  `;
}

export async function upsertNextAction(a: NextAction): Promise<void> {
  const sql = getDb();
  await sql`
    INSERT INTO next_actions (
      id,
      customer_id,
      label,
      priority,
      completed,
      completed_at,
      result_note
    )
    VALUES (
      ${a.id},
      ${a.customerId},
      ${a.label},
      ${a.priority},
      ${a.completed},
      ${a.completedAt ?? null},
      ${a.resultNote ?? null}
    )
    ON CONFLICT (id) DO UPDATE SET
      label = EXCLUDED.label,
      priority = EXCLUDED.priority,
      completed = EXCLUDED.completed,
      completed_at = EXCLUDED.completed_at,
      result_note = EXCLUDED.result_note
  `;
}

export async function deleteNextActionById(id: string): Promise<void> {
  const sql = getDb();
  await sql`DELETE FROM next_actions WHERE id = ${id}`;
}

export async function updateNextActionCompleted(
  id: string,
  completed: boolean,
  completedAt?: string,
): Promise<void> {
  const sql = getDb();
  await sql`
    UPDATE next_actions
    SET
      completed = ${completed},
      completed_at = ${completedAt ?? null}
    WHERE id = ${id}
  `;
}

export async function updateNextActionResult(
  id: string,
  resultNote: string,
): Promise<void> {
  const sql = getDb();
  await sql`
    UPDATE next_actions
    SET result_note = ${resultNote}
    WHERE id = ${id}
  `;
}

// ─────────────────────────────────────────────
// chat_messages
// ─────────────────────────────────────────────

function mapChatMessageKind(
  kind: unknown,
): ChatMessage["kind"] {
  if (
    kind === "landing" ||
    kind === "intent" ||
    kind === "proposal_question" ||
    kind === "proposal_document" ||
    kind === "text"
  ) {
    return kind;
  }
  console.warn("[cs-db] unknown chat message kind, fallback to text:", kind);
  return "text";
}

function mapChatMessageIntent(
  intent: unknown,
): ChatMessage["intent"] {
  if (
    intent === "perspective" ||
    intent === "actions" ||
    intent === "proposal"
  ) {
    return intent;
  }
  return undefined;
}

function mapChatMessageRow(r: Record<string, unknown>): ChatMessage {
  const kind = mapChatMessageKind(r.kind);
  let card: ChatMessage["card"] = undefined;
  let proposalCard: ChatMessage["proposalCard"] = undefined;

  if (kind === "landing" && r.card != null) {
    const parsed = landingCardSchema.safeParse(r.card);
    if (parsed.success) card = parsed.data;
  }
  if (kind === "proposal_question" && r.card != null) {
    const parsed = proposalQuestionCardSchema.safeParse(r.card);
    if (parsed.success) proposalCard = parsed.data;
  }

  return {
    id: r.id as string,
    customerId: r.customer_id as string,
    role: r.role as ChatMessage["role"],
    content: r.content as string,
    // DB の NULL を undefined に正規化（Zod の z.string().optional() は null を拒否する）
    timestamp: r.timestamp != null ? (r.timestamp as string) : undefined,
    kind,
    card,
    proposalCard,
    intent: mapChatMessageIntent(r.intent),
  };
}

export async function getChatMessages(
  customerId: string,
): Promise<ChatMessage[]> {
  const sql = getDb();
  const rows = await sql`
    SELECT id, customer_id, role, content, timestamp, kind, card, intent
    FROM chat_messages
    WHERE customer_id = ${customerId}
    ORDER BY created_at ASC
  `;
  return rows.map((r) => mapChatMessageRow(r as Record<string, unknown>));
}

export async function getAllChatMessages(): Promise<ChatMessage[]> {
  const sql = getDb();
  const rows = await sql`
    SELECT id, customer_id, role, content, timestamp, kind, card, intent
    FROM chat_messages
    ORDER BY created_at ASC
  `;
  return rows.map((r) => mapChatMessageRow(r as Record<string, unknown>));
}

export async function insertChatMessage(m: ChatMessage): Promise<void> {
  const sql = getDb();
  const kind = m.kind ?? "text";
  const cardPayload =
    kind === "landing" && m.card != null
      ? m.card
      : kind === "proposal_question" && m.proposalCard != null
        ? m.proposalCard
        : null;
  const card = cardPayload != null ? JSON.stringify(cardPayload) : null;
  await sql`
    INSERT INTO chat_messages (
      id,
      customer_id,
      role,
      content,
      timestamp,
      kind,
      card,
      intent
    )
    VALUES (
      ${m.id},
      ${m.customerId},
      ${m.role},
      ${m.content},
      ${m.timestamp ?? null},
      ${kind},
      ${card}::jsonb,
      ${m.intent ?? null}
    )
    ON CONFLICT (id) DO NOTHING
  `;
}

export async function deleteChatMessagesByIds(ids: string[]): Promise<void> {
  if (ids.length === 0) return;

  const sql = getDb();
  await Promise.all(
    ids.map((id) => sql`DELETE FROM chat_messages WHERE id = ${id}`),
  );
}

// ─────────────────────────────────────────────
// consultations
// ─────────────────────────────────────────────

function parseTranscript(value: unknown): ChatMessage[] | undefined {
  if (!Array.isArray(value)) return undefined;

  return value.flatMap((item) => {
    if (
      typeof item === "object" &&
      item !== null &&
      "id" in item &&
      "customerId" in item &&
      "role" in item &&
      "content" in item
    ) {
      const message = item as Partial<ChatMessage>;
      if (
        typeof message.id === "string" &&
        typeof message.customerId === "string" &&
        (message.role === "user" || message.role === "assistant") &&
        typeof message.content === "string"
      ) {
        return [
          {
            id: message.id,
            customerId: message.customerId,
            role: message.role,
            content: message.content,
            timestamp:
              typeof message.timestamp === "string"
                ? message.timestamp
                : undefined,
            kind: mapChatMessageKind(message.kind),
            intent: mapChatMessageIntent(message.intent),
            card:
              message.kind === "landing" && message.card != null
                ? landingCardSchema.safeParse(message.card).success
                  ? (message.card as ChatMessage["card"])
                  : undefined
                : undefined,
            proposalCard:
              message.kind === "proposal_question" &&
              message.proposalCard != null
                ? proposalQuestionCardSchema.safeParse(message.proposalCard)
                    .success
                  ? message.proposalCard
                  : undefined
                : undefined,
          },
        ];
      }
    }
    return [];
  });
}

export async function getAllConsultations(): Promise<Consultation[]> {
  const sql = getDb();
  const rows = await sql`
    SELECT id, customer_id, date, type, summary, transcript, archived
    FROM consultations
    WHERE archived IS NOT TRUE
    ORDER BY created_at ASC
  `;
  return rows.map((r) => ({
    id: r.id as string,
    customerId: r.customer_id as string,
    date: r.date as string,
    type: r.type as Consultation["type"],
    summary: r.summary as string,
    transcript: parseTranscript(r.transcript),
    archived: r.archived === true,
  }));
}

export async function insertConsultation(c: Consultation): Promise<void> {
  const sql = getDb();
  await sql`
    INSERT INTO consultations (
      id,
      customer_id,
      date,
      type,
      summary,
      transcript,
      archived
    )
    VALUES (
      ${c.id},
      ${c.customerId},
      ${c.date},
      ${c.type},
      ${c.summary},
      ${JSON.stringify(c.transcript ?? [])}::jsonb,
      ${c.archived ?? false}
    )
    ON CONFLICT (id) DO NOTHING
  `;
}

export async function archiveConsultationById(id: string): Promise<void> {
  const sql = getDb();
  await sql`UPDATE consultations SET archived = TRUE WHERE id = ${id}`;
}

// ─────────────────────────────────────────────
// settings
// ─────────────────────────────────────────────

export async function getWorkspaceUser(
  email: string,
  fallbackName: string,
): Promise<WorkspaceUser> {
  const sql = getDb();
  const settingsId = email.trim().toLowerCase();
  const rows = await sql`
    SELECT user_name
    FROM cs_settings
    WHERE id = ${settingsId}
    LIMIT 1
  `;
  return {
    name:
      rows[0]?.user_name != null
        ? (rows[0].user_name as string)
        : fallbackName,
  };
}

export async function updateWorkspaceUserName(
  email: string,
  name: string,
): Promise<void> {
  const sql = getDb();
  const settingsId = email.trim().toLowerCase();
  await sql`
    INSERT INTO cs_settings (id, user_name, updated_at)
    VALUES (${settingsId}, ${name}, NOW())
    ON CONFLICT (id) DO UPDATE SET
      user_name = EXCLUDED.user_name,
      updated_at = NOW()
  `;
}

export async function updateAllCustomersAccountManager(
  accountManager: string,
): Promise<void> {
  const sql = getDb();
  await sql`
    UPDATE customers
    SET account_manager = ${accountManager}
  `;
}
