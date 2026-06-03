"use client";

/**
 * CsWorkspace: CSアシスタント 4 ペインの親コンポーネント。
 *
 * - Pane 1: CustomerListPane — 担当顧客一覧・フェーズ表示・検索
 * - Pane 2: CustomerSummaryPane — 選択顧客の基本情報・相談履歴タイムライン
 * - Pane 3: AIChatPane — 上司役AIとの1-on-1対話（チャット形式）
 * - Pane 4: NextActionPane — チェックボックス付きネクストアクション一覧
 *
 * フェーズ1: 画面の見た目のみ。データ保存・AI連携はなし。
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
      setCustomers((prev) => [...prev, newCustomer]);
      setSelectedCustomerId(newCustomer.id);
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
      setChatMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}`,
          customerId: activeCustomer.id,
          role: "user",
          content,
          timestamp,
        },
      ]);
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
    setChatMessages((prev) => [
      ...prev,
      {
        id: `msg-${Date.now()}`,
        customerId: activeCustomer.id,
        role: "assistant",
        content: GRILL_ME_PROMPT,
        timestamp,
      },
    ]);
  }, [activeCustomer]);

  const toggleAction = useCallback((id: string, completed: boolean) => {
    setNextActions((prev) =>
      prev.map((a) => (a.id === id ? { ...a, completed } : a)),
    );
  }, []);

  const addAction = useCallback(
    (label: string) => {
      if (!activeCustomer) return;
      setNextActions((prev) => [
        ...prev,
        {
          id: `action-${Date.now()}`,
          customerId: activeCustomer.id,
          label,
          priority: "medium",
          completed: false,
        },
      ]);
    },
    [activeCustomer],
  );

  const deleteAction = useCallback((id: string) => {
    setNextActions((prev) => prev.filter((a) => a.id !== id));
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
