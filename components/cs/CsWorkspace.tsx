"use client";

/**
 * CsWorkspace: CSアシスタント 4 ペインの親コンポーネント。
 *
 * - Pane 1: CustomerListPane — 担当顧客一覧・フェーズ表示・検索
 * - Pane 2: CustomerSummaryPane — 選択顧客の基本情報・相談履歴タイムライン
 * - Pane 3: AIChatPane — 上司役AIとの1-on-1対話（チャット形式）
 * - Pane 4: NextActionPane — チェックボックス付きネクストアクション一覧
 *
 * フェーズ2: Neon DB連携。操作はServer Actionsを通じてDBに保存。
 * 仕様: docs/design-decisions.md
 */

import { useCallback, useMemo, useState } from "react";

import {
  type ChatMessage,
  type Consultation,
  type CsWorkspace as CsWorkspaceType,
  type Customer,
  type NextAction,
} from "@/lib/cs-schema";
import { CsGlobalHeader } from "@/components/cs/CsGlobalHeader";
import { CustomerListPane } from "@/components/cs/CustomerListPane";
import { CustomerSummaryPane } from "@/components/cs/CustomerSummaryPane";
import { AIChatPane } from "@/components/cs/AIChatPane";
import { NextActionPane } from "@/components/cs/NextActionPane";
import {
  addCustomerAction,
  addNextActionAction,
  toggleNextActionAction,
  deleteNextActionAction,
  addChatMessageAction,
} from "@/app/cs/actions";

type CsWorkspaceProps = {
  initialCustomers: Customer[];
  initialConsultations: Consultation[];
  initialChatMessages: ChatMessage[];
  initialNextActions: NextAction[];
  workspace: CsWorkspaceType;
};

const GRILL_ME_PROMPT =
  "では、まずその顧客との関係性はどうですか？最近のやり取りで気になっていることはありますか？";

export function CsWorkspace({
  initialCustomers,
  initialConsultations,
  initialChatMessages,
  initialNextActions,
  workspace,
}: CsWorkspaceProps) {
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [consultations] = useState<Consultation[]>(initialConsultations);
  const [chatMessages, setChatMessages] =
    useState<ChatMessage[]>(initialChatMessages);
  const [nextActions, setNextActions] =
    useState<NextAction[]>(initialNextActions);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    initialCustomers[0]?.id ?? "",
  );

  const activeCustomer =
    customers.find((c) => c.id === selectedCustomerId) ?? customers[0];

  const customerConsultations = useMemo(
    () => consultations.filter((c) => c.customerId === activeCustomer?.id),
    [consultations, activeCustomer?.id],
  );

  const customerMessages = useMemo(
    () => chatMessages.filter((m) => m.customerId === activeCustomer?.id),
    [chatMessages, activeCustomer?.id],
  );

  const customerActions = useMemo(
    () => nextActions.filter((a) => a.customerId === activeCustomer?.id),
    [nextActions, activeCustomer?.id],
  );

  const selectCustomer = useCallback((id: string) => {
    setSelectedCustomerId(id);
  }, []);

  const addCustomer = useCallback(
    (name: string) => {
      const newCustomer: Customer = {
        id: `cust-${Date.now()}`,
        name,
        phase: "onboarding",
        contractStartDate: "—",
        accountManager: workspace.currentUser.name,
      };
      // 楽観的更新: UIを即時反映してからDBに保存
      setCustomers((prev) => [...prev, newCustomer]);
      setSelectedCustomerId(newCustomer.id);
      addCustomerAction(newCustomer).catch(console.error);
    },
    [workspace.currentUser.name],
  );

  const sendMessage = useCallback(
    (content: string) => {
      if (!activeCustomer) return;
      const timestamp = new Date().toLocaleTimeString("ja-JP", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      const message: ChatMessage = {
        id: `msg-${Date.now()}`,
        customerId: activeCustomer.id,
        role: "user",
        content,
        timestamp,
      };
      setChatMessages((prev) => [...prev, message]);
      addChatMessageAction(message).catch(console.error);
    },
    [activeCustomer],
  );

  const startGrillMe = useCallback(() => {
    if (!activeCustomer) return;
    const timestamp = new Date().toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const message: ChatMessage = {
      id: `msg-${Date.now()}`,
      customerId: activeCustomer.id,
      role: "assistant",
      content: GRILL_ME_PROMPT,
      timestamp,
    };
    setChatMessages((prev) => [...prev, message]);
    addChatMessageAction(message).catch(console.error);
  }, [activeCustomer]);

  const toggleAction = useCallback((id: string, completed: boolean) => {
    setNextActions((prev) =>
      prev.map((a) => (a.id === id ? { ...a, completed } : a)),
    );
    toggleNextActionAction(id, completed).catch(console.error);
  }, []);

  const addAction = useCallback(
    (label: string) => {
      if (!activeCustomer) return;
      const action: NextAction = {
        id: `action-${Date.now()}`,
        customerId: activeCustomer.id,
        label,
        priority: "medium",
        completed: false,
      };
      setNextActions((prev) => [...prev, action]);
      addNextActionAction(action).catch(console.error);
    },
    [activeCustomer],
  );

  const deleteAction = useCallback((id: string) => {
    setNextActions((prev) => prev.filter((a) => a.id !== id));
    deleteNextActionAction(id).catch(console.error);
  }, []);

  if (!activeCustomer) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-muted-foreground">
        顧客データがありません
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-background text-foreground">
      <CsGlobalHeader workspace={workspace} />
      <div className="flex min-h-0 flex-1">
        <CustomerListPane
          customers={customers}
          selectedCustomerId={selectedCustomerId}
          onSelectCustomer={selectCustomer}
          onAddCustomer={addCustomer}
        />
        <CustomerSummaryPane
          customer={activeCustomer}
          consultations={customerConsultations}
        />
        <AIChatPane
          key={activeCustomer.id}
          messages={customerMessages}
          onSendMessage={sendMessage}
          onStartGrillMe={startGrillMe}
        />
        <NextActionPane
          key={`actions-${activeCustomer.id}`}
          actions={customerActions}
          onToggleAction={toggleAction}
          onAddAction={addAction}
          onDeleteAction={deleteAction}
        />
      </div>
    </div>
  );
}
