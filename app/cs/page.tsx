import { CsWorkspace } from "@/components/cs/CsWorkspace";
import {
  getCustomers,
  getAllNextActions,
  getAllChatMessages,
  getAllConsultations,
  getWorkspaceUser,
  initTables,
  updateAllCustomersAccountManager,
} from "@/lib/cs-db";
import workspaceData from "@/data/cs-workspace.json";
import consultationsData from "@/data/consultations.json";
import { csWorkspaceSchema, consultationsSchema } from "@/lib/cs-schema";

// DBから毎回最新データを取得するため動的レンダリングに固定
export const dynamic = "force-dynamic";

export default async function CsPage() {
  // テーブルが存在しない場合に備えて初期化
  await initTables();

  const consultationsResult = consultationsSchema.safeParse(consultationsData);
  const wsResult = csWorkspaceSchema.safeParse(workspaceData);

  if (!consultationsResult.success || !wsResult.success) {
    throw new Error("設定データの形式が正しくありません");
  }

  // DBからデータを取得
  const [customers, nextActions, chatMessages, savedConsultations, currentUser] =
    await Promise.all([
      getCustomers(),
      getAllNextActions(),
      getAllChatMessages(),
      getAllConsultations(),
      getWorkspaceUser(wsResult.data.currentUser.name),
    ]);

  // 一人利用前提: 登録名と顧客の社内担当CSを揃える
  let syncedCustomers = customers;
  if (
    currentUser.name &&
    customers.some((customer) => customer.accountManager !== currentUser.name)
  ) {
    await updateAllCustomersAccountManager(currentUser.name);
    syncedCustomers = await getCustomers();
  }

  // 相談履歴はデモ初期データ + DB保存された相談ログを表示する
  return (
    <CsWorkspace
      initialCustomers={syncedCustomers}
      initialConsultations={[
        ...consultationsResult.data,
        ...savedConsultations,
      ]}
      initialChatMessages={chatMessages}
      initialNextActions={nextActions}
      workspace={{ ...wsResult.data, currentUser }}
    />
  );
}
