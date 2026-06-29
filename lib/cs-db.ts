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
import type {
  ChatMessage,
  Customer,
  NextAction,
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
}

// ─────────────────────────────────────────────
// customers
// ─────────────────────────────────────────────

export async function getCustomers(): Promise<Customer[]> {
  const sql = getDb();
  const rows = await sql`
    SELECT id, name, phase, contract_start_date, account_manager
    FROM customers
    ORDER BY created_at ASC
  `;
  return rows.map((r) => ({
    id: r.id as string,
    name: r.name as string,
    phase: r.phase as Customer["phase"],
    contractStartDate: r.contract_start_date as string,
    accountManager: r.account_manager as string,
  }));
}

export async function insertCustomer(c: Customer): Promise<void> {
  const sql = getDb();
  await sql`
    INSERT INTO customers (id, name, phase, contract_start_date, account_manager)
    VALUES (${c.id}, ${c.name}, ${c.phase}, ${c.contractStartDate}, ${c.accountManager})
    ON CONFLICT (id) DO NOTHING
  `;
}

// ─────────────────────────────────────────────
// next_actions
// ─────────────────────────────────────────────

export async function getNextActions(customerId: string): Promise<NextAction[]> {
  const sql = getDb();
  const rows = await sql`
    SELECT id, customer_id, label, priority, completed
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
  }));
}

export async function getAllNextActions(): Promise<NextAction[]> {
  const sql = getDb();
  const rows = await sql`
    SELECT id, customer_id, label, priority, completed
    FROM next_actions
    ORDER BY created_at ASC
  `;
  return rows.map((r) => ({
    id: r.id as string,
    customerId: r.customer_id as string,
    label: r.label as string,
    priority: r.priority as NextAction["priority"],
    completed: r.completed as boolean,
  }));
}

export async function insertNextAction(a: NextAction): Promise<void> {
  const sql = getDb();
  await sql`
    INSERT INTO next_actions (id, customer_id, label, priority, completed)
    VALUES (${a.id}, ${a.customerId}, ${a.label}, ${a.priority}, ${a.completed})
    ON CONFLICT (id) DO NOTHING
  `;
}

export async function upsertNextAction(a: NextAction): Promise<void> {
  const sql = getDb();
  await sql`
    INSERT INTO next_actions (id, customer_id, label, priority, completed)
    VALUES (${a.id}, ${a.customerId}, ${a.label}, ${a.priority}, ${a.completed})
    ON CONFLICT (id) DO UPDATE SET
      label = EXCLUDED.label,
      priority = EXCLUDED.priority,
      completed = EXCLUDED.completed
  `;
}

export async function deleteNextActionById(id: string): Promise<void> {
  const sql = getDb();
  await sql`DELETE FROM next_actions WHERE id = ${id}`;
}

export async function updateNextActionCompleted(
  id: string,
  completed: boolean,
): Promise<void> {
  const sql = getDb();
  await sql`UPDATE next_actions SET completed = ${completed} WHERE id = ${id}`;
}

// ─────────────────────────────────────────────
// chat_messages
// ─────────────────────────────────────────────

export async function getChatMessages(customerId: string): Promise<ChatMessage[]> {
  const sql = getDb();
  const rows = await sql`
    SELECT id, customer_id, role, content, timestamp
    FROM chat_messages
    WHERE customer_id = ${customerId}
    ORDER BY created_at ASC
  `;
  return rows.map((r) => ({
    id: r.id as string,
    customerId: r.customer_id as string,
    role: r.role as ChatMessage["role"],
    content: r.content as string,
    timestamp: r.timestamp as string | undefined,
  }));
}

export async function getAllChatMessages(): Promise<ChatMessage[]> {
  const sql = getDb();
  const rows = await sql`
    SELECT id, customer_id, role, content, timestamp
    FROM chat_messages
    ORDER BY created_at ASC
  `;
  return rows.map((r) => ({
    id: r.id as string,
    customerId: r.customer_id as string,
    role: r.role as ChatMessage["role"],
    content: r.content as string,
    timestamp: r.timestamp as string | undefined,
  }));
}

export async function insertChatMessage(m: ChatMessage): Promise<void> {
  const sql = getDb();
  await sql`
    INSERT INTO chat_messages (id, customer_id, role, content, timestamp)
    VALUES (${m.id}, ${m.customerId}, ${m.role}, ${m.content}, ${m.timestamp ?? null})
    ON CONFLICT (id) DO NOTHING
  `;
}
