"use client";

/**
 * CsWorkspace: CSアシスタント 4 ペインの親コンポーネント。
 *
 * - Pane 1: CustomerListPane — 担当顧客一覧・フェーズ表示・検索
 * - Pane 2: CustomerSummaryPane — 選択顧客の基本情報・相談履歴タイムライン
 * - Pane 3: AIChatPane — 上司役AIとの1-on-1対話（チャット形式・Gemini API連携）
 * - Pane 4: NextActionPane — チェックボックス付きネクストアクション一覧
 *
 * フェーズ3: Gemini AI統合。
 * - sendMessage: ユーザーメッセージをDBへ保存後、Gemini APIをストリーミング呼び出し
 * - startGrillMe: Grill Meプロンプトでセッション開始
 * 仕様: docs/design-decisions.md
 */

import { useCallback, useMemo, useRef, useState } from "react";

import {
  type ChatMessage,
  type Consultation,
  type CsWorkspace as CsWorkspaceType,
  type Customer,
  type NextAction,
} from "@/lib/cs-schema";
import { GRILL_ME_FIRST_MESSAGE } from "@/lib/cs-ai-prompt";
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

function nowTimestamp() {
  return new Date().toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

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

  // AIチャット用の状態
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState<string>("");
  const [aiError, setAiError] = useState<string | null>(null);
  // 同時送信を防ぐ ref（stateより即時性がある）
  const isFetchingRef = useRef(false);

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
      addCustomerAction(newCustomer).catch(console.error);
    },
    [workspace.currentUser.name],
  );

  /**
   * Gemini API をストリーミングで呼び出し、AIの返答をリアルタイム表示する。
   * 完了後、AIメッセージを DBに保存する。
   */
  const callAiStream = useCallback(
    async (
      messagesWithUser: ChatMessage[],
      customer: Customer,
    ) => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;
      setIsAiLoading(true);
      setStreamingContent("");
      setAiError(null);

      let fullContent = "";

      try {
        const res = await fetch("/api/cs/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ customer, messages: messagesWithUser }),
        });

        if (!res.ok || !res.body) {
          const data = await res.json().catch(() => ({}));
          throw new Error(
            (data as { error?: string }).error ??
              "AIとの通信に失敗しました。しばらくしてからお試しください。",
          );
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const payload = line.slice(6).trim();
            if (payload === "[DONE]") break;
            try {
              const chunk = JSON.parse(payload) as string | { error: string };
              if (typeof chunk === "string") {
                fullContent += chunk;
                setStreamingContent(fullContent);
              } else if (chunk.error) {
                throw new Error(chunk.error);
              }
            } catch {
              // JSON パースエラーは無視して継続
            }
          }
        }

        if (!fullContent) {
          throw new Error("AIから返答が得られませんでした。");
        }

        // ストリーミング完了 → AIメッセージを確定してDBに保存
        const aiMessage: ChatMessage = {
          id: `msg-${Date.now()}`,
          customerId: customer.id,
          role: "assistant",
          content: fullContent,
          timestamp: nowTimestamp(),
        };
        setChatMessages((prev) => [...prev, aiMessage]);
        addChatMessageAction(aiMessage).catch(console.error);
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : "AIとの通信中にエラーが発生しました。";
        setAiError(msg);
      } finally {
        setIsAiLoading(false);
        setStreamingContent("");
        isFetchingRef.current = false;
      }
    },
    [],
  );

  const sendMessage = useCallback(
    (content: string) => {
      if (!activeCustomer || isFetchingRef.current) return;

      const userMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        customerId: activeCustomer.id,
        role: "user",
        content,
        timestamp: nowTimestamp(),
      };

      // 楽観的更新 + DB保存
      const updatedMessages = [...customerMessages, userMessage];
      setChatMessages((prev) => [...prev, userMessage]);
      addChatMessageAction(userMessage).catch(console.error);

      // Gemini API 呼び出し
      callAiStream(updatedMessages, activeCustomer).catch(console.error);
    },
    [activeCustomer, customerMessages, callAiStream],
  );

  const startGrillMe = useCallback(() => {
    if (!activeCustomer || isFetchingRef.current) return;

    // Grill Me: AIからの最初の問いかけをすぐ表示（DB保存も）
    const grillMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      customerId: activeCustomer.id,
      role: "assistant",
      content: GRILL_ME_FIRST_MESSAGE,
      timestamp: nowTimestamp(),
    };
    setChatMessages((prev) => [...prev, grillMessage]);
    addChatMessageAction(grillMessage).catch(console.error);
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
          isLoading={isAiLoading}
          streamingContent={streamingContent}
          errorMessage={aiError}
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
