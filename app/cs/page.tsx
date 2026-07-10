import { CsWorkspace } from "@/components/cs/CsWorkspace";
import {
  getCustomers,
  getAllNextActions,
  getAllChatMessages,
  getAllConsultations,
  initTables,
} from "@/lib/cs-db";
import workspaceData from "@/data/cs-workspace.json";
import consultationsData from "@/data/consultations.json";
import { csWorkspaceSchema, consultationsSchema } from "@/lib/cs-schema";

// DBから毎回最新データを取得するため動的レンダリングに固定
export const dynamic = "force-dynamic";

export default async function CsPage() {
  // テーブルが存在しない場合に備えて初期化
  await initTables();

  // DBからデータを取得
  const [customers, nextActions, chatMessages, savedConsultations] =
    await Promise.all([
      getCustomers(),
      getAllNextActions(),
      getAllChatMessages(),
      getAllConsultations(),
    ]);

  // 相談履歴はデモ初期データ + DB保存された相談ログを表示する
  const consultationsResult = consultationsSchema.safeParse(consultationsData);
  const wsResult = csWorkspaceSchema.safeParse(workspaceData);

  if (!consultationsResult.success || !wsResult.success) {
    throw new Error("設定データの形式が正しくありません");
  }

  return (
    <CsWorkspace
      initialCustomers={customers}
      initialConsultations={[
        ...consultationsResult.data,
        ...savedConsultations,
      ]}
      initialChatMessages={chatMessages}
      initialNextActions={nextActions}
      workspace={wsResult.data}
    />
  );
}
