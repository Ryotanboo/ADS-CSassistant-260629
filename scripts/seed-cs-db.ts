/**
 * DBテーブルを作成してシードデータを投入するスクリプト。
 * 初回セットアップ時に1回だけ実行する。
 * 実行: npx tsx scripts/seed-cs-db.ts
 */

import { config } from "dotenv";
import { resolve } from "path";

// .env.local を読み込む
config({ path: resolve(process.cwd(), ".env.local") });

import { neon } from "@neondatabase/serverless";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL が設定されていません。.env.local を確認してください。");
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function main() {
  console.log("テーブルを作成中...");

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

  console.log("テーブル作成完了。シードデータを投入中...");

  // customers
  const customers = [
    { id: "cust-abc", name: "株式会社ABC", phase: "onboarding", contractStartDate: "2025年4月1日", accountManager: "山田 太郎" },
    { id: "cust-def", name: "株式会社DEF", phase: "adoption", contractStartDate: "2024年11月15日", accountManager: "佐藤 花子" },
    { id: "cust-ghi", name: "株式会社GHI", phase: "success", contractStartDate: "2024年6月1日", accountManager: "山田 太郎" },
    { id: "cust-jkl", name: "株式会社JKL", phase: "success", contractStartDate: "2024年3月10日", accountManager: "鈴木 一郎" },
    { id: "cust-mno", name: "株式会社MNO", phase: "adoption", contractStartDate: "2025年1月20日", accountManager: "佐藤 花子" },
    { id: "cust-pqr", name: "株式会社PQR", phase: "success", contractStartDate: "2023年9月5日", accountManager: "山田 太郎" },
    { id: "cust-stu", name: "株式会社STU", phase: "success", contractStartDate: "2023年12月18日", accountManager: "鈴木 一郎" },
    { id: "cust-vwx", name: "株式会社VWX", phase: "success", contractStartDate: "2024年8月22日", accountManager: "佐藤 花子" },
  ];

  for (const c of customers) {
    await sql`
      INSERT INTO customers (id, name, phase, contract_start_date, account_manager)
      VALUES (${c.id}, ${c.name}, ${c.phase}, ${c.contractStartDate}, ${c.accountManager})
      ON CONFLICT (id) DO NOTHING
    `;
  }
  console.log(`  顧客: ${customers.length} 件`);

  // next_actions
  const actions = [
    { id: "action-1", customerId: "cust-abc", label: "機能要望の背景ニーズを確認する", priority: "high", completed: true },
    { id: "action-2", customerId: "cust-abc", label: "リリーススケジュールへの影響を確認", priority: "high", completed: false },
    { id: "action-3", customerId: "cust-abc", label: "感情面でのフォローアップを検討", priority: "medium", completed: false },
    { id: "action-4", customerId: "cust-abc", label: "担当者と次回MTGを設定", priority: "medium", completed: false },
  ];

  for (const a of actions) {
    await sql`
      INSERT INTO next_actions (id, customer_id, label, priority, completed)
      VALUES (${a.id}, ${a.customerId}, ${a.label}, ${a.priority}, ${a.completed})
      ON CONFLICT (id) DO NOTHING
    `;
  }
  console.log(`  ネクストアクション: ${actions.length} 件`);

  // chat_messages
  const messages = [
    { id: "msg-1", customerId: "cust-abc", role: "assistant", content: "今日はどの顧客について話しますか？現状を教えてください", timestamp: null },
    { id: "msg-2", customerId: "cust-abc", role: "user", content: "株式会社ABCの担当者から機能要望をもらったのですが、どう対応すべきか悩んでいます", timestamp: "10:32" },
    { id: "msg-3", customerId: "cust-abc", role: "assistant", content: "なるほど、機能要望ですね。その要望が実現する場合、リリーススケジュールや他の顧客への影響はありますか？", timestamp: "10:33" },
  ];

  for (const m of messages) {
    await sql`
      INSERT INTO chat_messages (id, customer_id, role, content, timestamp)
      VALUES (${m.id}, ${m.customerId}, ${m.role}, ${m.content}, ${m.timestamp})
      ON CONFLICT (id) DO NOTHING
    `;
  }
  console.log(`  チャットメッセージ: ${messages.length} 件`);

  console.log("シード完了！");
}

main().catch((err) => {
  console.error("エラー:", err);
  process.exit(1);
});
