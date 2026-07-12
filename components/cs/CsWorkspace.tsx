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
 * - generateLanding: 会話を構造化着地カードに変換してPane 4と接続
 */

import { useCallback, useMemo, useRef, useState } from "react";

import {
  type ChatMessage,
  type Consultation,
  type ConversationIntent,
  type CsWorkspace as CsWorkspaceType,
  type Customer,
  type LandingCard,
  type NextAction,
} from "@/lib/cs-schema";
import { GRILL_ME_FIRST_MESSAGE } from "@/lib/cs-ai-prompt";
import { CONVERSATION_INTENT_PROMPTS } from "@/lib/cs-conversation-intents";
import { CsGlobalHeader } from "@/components/cs/CsGlobalHeader";
import {
  CustomerListPane,
  type AddCustomerInput,
} from "@/components/cs/CustomerListPane";
import { CustomerSummaryPane } from "@/components/cs/CustomerSummaryPane";
import { AIChatPane } from "@/components/cs/AIChatPane";
import { NextActionPane } from "@/components/cs/NextActionPane";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  CS_PANE_LAYOUT_STORAGE_ID,
  CS_PANE_SIZE,
  useCsPaneLayout,
} from "@/hooks/use-cs-pane-layout";
import {
  addCustomerAction,
  addNextActionAction,
  archiveCustomerAction,
  deleteCustomerAction,
  toggleNextActionAction,
  deleteNextActionAction,
  addChatMessageAction,
  archiveChatSessionAction,
  archiveConsultationAction,
  discardChatSessionAction,
  updateCustomerFtSummaryAction,
  updateNextActionResultAction,
  updateWorkspaceUserNameAction,
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

/** meta ブロック [[meta]]...[[/meta]] を解析する */
function parseMeta(content: string): {
  cleanContent: string;
  readyToLand: boolean;
} {
  const metaMatch = content.match(/\[\[meta\]\]([\s\S]*?)\[\[\/meta\]\]/);
  const cleanContent = content
    .replace(/\[\[meta\]\][\s\S]*?\[\[\/meta\]\]/g, "")
    .trimEnd();

  if (!metaMatch) {
    return { cleanContent, readyToLand: false };
  }

  try {
    const meta = JSON.parse(metaMatch[1]) as {
      readyToLand?: boolean;
    };
    return {
      cleanContent,
      readyToLand: meta.readyToLand === true,
    };
  } catch {
    return { cleanContent, readyToLand: false };
  }
}

/** ストリーミング中: meta ブロック開始以降を非表示にする */
function stripPartialMeta(content: string): string {
  return content.replace(/\[\[meta\]\][\s\S]*$/, "").trimEnd();
}

export function CsWorkspace({
  initialCustomers,
  initialConsultations,
  initialChatMessages,
  initialNextActions,
  workspace,
}: CsWorkspaceProps) {
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [consultations, setConsultations] =
    useState<Consultation[]>(initialConsultations);
  const [chatMessages, setChatMessages] =
    useState<ChatMessage[]>(initialChatMessages);
  const [nextActions, setNextActions] =
    useState<NextAction[]>(initialNextActions);
  const [workspaceState, setWorkspaceState] =
    useState<CsWorkspaceType>(workspace);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    initialCustomers[0]?.id ?? "",
  );

  // AIチャット用の状態
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isArchivingChat, setIsArchivingChat] = useState(false);
  const [isGeneratingLanding, setIsGeneratingLanding] = useState(false);
  const [streamingContent, setStreamingContent] = useState<string>("");
  const [aiError, setAiError] = useState<string | null>(null);

  // 同時送信を防ぐ ref（stateより即時性がある）
  const isFetchingRef = useRef(false);
  // 自動着地の重複実行を防ぐ（顧客IDごとに管理）
  const hasAutoLandedRef = useRef<Set<string>>(new Set());

  const activeCustomer =
    customers.find((c) => c.id === selectedCustomerId && !c.archived) ??
    customers.find((c) => c.id === selectedCustomerId) ??
    customers.find((c) => !c.archived) ??
    customers[0];

  const customerConsultations = useMemo(
    () =>
      consultations.filter(
        (c) => c.customerId === activeCustomer?.id && !c.archived,
      ),
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

  const addCustomer = useCallback((input: AddCustomerInput) => {
    const newCustomer: Customer = {
      id: `cust-${Date.now()}`,
      name: input.name,
      phase: input.phase,
      contractStartDate: "—",
      accountManager: input.accountManager,
      archived: false,
    };
    setCustomers((prev) => [...prev, newCustomer]);
    setSelectedCustomerId(newCustomer.id);
    addCustomerAction(newCustomer).catch(console.error);
  }, []);

  const archiveCustomer = useCallback(
    (id: string, archived: boolean) => {
      setCustomers((prev) => {
        const next = prev.map((customer) =>
          customer.id === id ? { ...customer, archived } : customer,
        );
        if (archived && selectedCustomerId === id) {
          const nextActive =
            next.find((customer) => !customer.archived)?.id ??
            next[0]?.id ??
            "";
          setSelectedCustomerId(nextActive);
        }
        return next;
      });
      archiveCustomerAction(id, archived).catch(console.error);
    },
    [selectedCustomerId],
  );

  const deleteCustomer = useCallback(
    (id: string) => {
      setCustomers((prev) => {
        const next = prev.filter((customer) => customer.id !== id);
        if (selectedCustomerId === id) {
          const nextActive =
            next.find((customer) => !customer.archived)?.id ??
            next[0]?.id ??
            "";
          setSelectedCustomerId(nextActive);
        }
        return next;
      });
      setConsultations((prev) =>
        prev.filter((consultation) => consultation.customerId !== id),
      );
      setChatMessages((prev) =>
        prev.filter((message) => message.customerId !== id),
      );
      setNextActions((prev) =>
        prev.filter((action) => action.customerId !== id),
      );
      deleteCustomerAction(id).catch(console.error);
    },
    [selectedCustomerId],
  );

  /**
   * 着地カードを生成して Pane 3 に表示する。
   * 手動ボタン（整理する）と自動トリガー（readyToLand）の両方から呼ばれる。
   */
  const generateLanding = useCallback(
    async (
      customer: Customer,
      messages: ChatMessage[],
      contextConsultations: Consultation[],
      contextActions: NextAction[],
    ) => {
      if (isGeneratingLanding || isFetchingRef.current) return;
      const textMessages = messages.filter((m) => m.kind !== "landing");
      if (textMessages.length === 0) return;

      setIsGeneratingLanding(true);
      setAiError(null);

      try {
        const res = await fetch("/api/cs/chat/landing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customer,
            messages: textMessages,
            consultations: contextConsultations,
            nextActions: contextActions,
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(
            (data as { error?: string }).error ??
              "着地カードの生成に失敗しました。",
          );
        }

        const card = (await res.json()) as LandingCard;

        // 着地カードをアシスタントメッセージとして保存（テキスト内容は人が読める形式）
        const cardContent = [
          "【ここまでの整理】",
          ...card.summary.map((s) => `• ${s}`),
          ...(card.openQuestions.length > 0
            ? ["\n【未確認事項】", ...card.openQuestions.map((q) => `• ${q}`)]
            : []),
          "\n【次にやること】",
          ...card.nextActions.map((a) => `• ${a.label}`),
        ]
          .filter(Boolean)
          .join("\n");

        const landingMessage: ChatMessage = {
          id: `msg-${Date.now()}`,
          customerId: customer.id,
          role: "assistant",
          content: cardContent,
          timestamp: nowTimestamp(),
          kind: "landing",
          card,
        };

        setChatMessages((prev) => [...prev, landingMessage]);
        addChatMessageAction(landingMessage).catch(console.error);
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : "着地カードの生成中にエラーが発生しました。";
        setAiError(msg);
      } finally {
        setIsGeneratingLanding(false);
      }
    },
    [isGeneratingLanding],
  );

  /**
   * Gemini API をストリーミングで呼び出し、AIの返答をリアルタイム表示する。
   * 完了後、meta ブロックを解析して自動着地を処理する。
   */
  const callAiStream = useCallback(
    async (
      messagesWithUser: ChatMessage[],
      customer: Customer,
      contextConsultations: Consultation[],
      contextActions: NextAction[],
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
          body: JSON.stringify({
            customer,
            messages: messagesWithUser,
            consultations: contextConsultations,
            nextActions: contextActions,
          }),
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
                // ストリーミング中は meta ブロック開始以降を非表示
                setStreamingContent(stripPartialMeta(fullContent));
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

        // meta ブロックを解析して本文をクリーン化
        const { cleanContent, readyToLand } = parseMeta(fullContent);

        if (!cleanContent) {
          throw new Error("AIから返答が得られませんでした。");
        }

        // ストリーミング完了 → AIメッセージを確定してDBに保存
        const aiMessage: ChatMessage = {
          id: `msg-${Date.now()}`,
          customerId: customer.id,
          role: "assistant",
          content: cleanContent,
          timestamp: nowTimestamp(),
          kind: "text",
        };
        setChatMessages((prev) => [...prev, aiMessage]);
        addChatMessageAction(aiMessage).catch(console.error);

        // 自動着地: readyToLand が true かつ未実行の場合のみ
        if (readyToLand && !hasAutoLandedRef.current.has(customer.id)) {
          hasAutoLandedRef.current.add(customer.id);
          const updatedMessages = [
            ...messagesWithUser.filter((m) => m.kind !== "landing"),
            aiMessage,
          ];
          // isFetchingRef を一時解放して generateLanding を呼べるようにする
          isFetchingRef.current = false;
          await generateLanding(
            customer,
            updatedMessages,
            contextConsultations,
            contextActions,
          );
          isFetchingRef.current = true; // finally で false に戻るため再セット不要
        }
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
    [generateLanding],
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
        kind: "text",
      };

      // 楽観的更新 + DB保存
      const updatedMessages = [...customerMessages, userMessage];
      setChatMessages((prev) => [...prev, userMessage]);
      addChatMessageAction(userMessage).catch(console.error);

      // Gemini API 呼び出し
      callAiStream(
        updatedMessages,
        activeCustomer,
        customerConsultations,
        customerActions,
      ).catch(console.error);
    },
    [
      activeCustomer,
      customerMessages,
      customerConsultations,
      customerActions,
      callAiStream,
    ],
  );

  const requestConversationIntent = useCallback(
    (intent: ConversationIntent) => {
      if (!activeCustomer || isFetchingRef.current) return;

      const intentMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        customerId: activeCustomer.id,
        role: "user",
        content: CONVERSATION_INTENT_PROMPTS[intent],
        timestamp: nowTimestamp(),
        kind: "intent",
        intent,
      };
      const updatedMessages = [...customerMessages, intentMessage];
      setChatMessages((prev) => [...prev, intentMessage]);
      addChatMessageAction(intentMessage).catch(console.error);
      callAiStream(
        updatedMessages,
        activeCustomer,
        customerConsultations,
        customerActions,
      ).catch(console.error);
    },
    [
      activeCustomer,
      customerActions,
      customerConsultations,
      customerMessages,
      callAiStream,
    ],
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
      kind: "text",
    };
    setChatMessages((prev) => [...prev, grillMessage]);
    addChatMessageAction(grillMessage).catch(console.error);
  }, [activeCustomer]);

  const requestLanding = useCallback(() => {
    if (!activeCustomer) return;
    generateLanding(
      activeCustomer,
      customerMessages,
      customerConsultations,
      customerActions,
    ).catch(console.error);
  }, [
    activeCustomer,
    customerMessages,
    customerConsultations,
    customerActions,
    generateLanding,
  ]);

  const archiveChatSession = useCallback(async () => {
    if (
      !activeCustomer ||
      customerMessages.length === 0 ||
      isArchivingChat ||
      isFetchingRef.current
    ) {
      return;
    }

    const messagesToArchive = customerMessages;
    setIsArchivingChat(true);
    setChatMessages((prev) =>
      prev.filter((message) => message.customerId !== activeCustomer.id),
    );
    hasAutoLandedRef.current.delete(activeCustomer.id);

    try {
      const consultation = await archiveChatSessionAction(
        activeCustomer,
        messagesToArchive,
      );
      setConsultations((prev) => [...prev, consultation]);
    } catch (err) {
      console.error(err);
      setChatMessages((prev) => [...prev, ...messagesToArchive]);
      setAiError(
        err instanceof Error ? err.message : "相談履歴の保存に失敗しました。",
      );
      throw err;
    } finally {
      setIsArchivingChat(false);
    }
  }, [activeCustomer, customerMessages, isArchivingChat]);

  const discardChatSession = useCallback(async () => {
    if (
      !activeCustomer ||
      customerMessages.length === 0 ||
      isArchivingChat ||
      isFetchingRef.current
    ) {
      return;
    }

    const messagesToDiscard = customerMessages;
    setIsArchivingChat(true);
    setChatMessages((prev) =>
      prev.filter((message) => message.customerId !== activeCustomer.id),
    );
    hasAutoLandedRef.current.delete(activeCustomer.id);

    try {
      await discardChatSessionAction(messagesToDiscard);
    } catch (err) {
      console.error(err);
      setChatMessages((prev) => [...prev, ...messagesToDiscard]);
      setAiError(
        err instanceof Error
          ? err.message
          : "チャット履歴の破棄に失敗しました。",
      );
      throw err;
    } finally {
      setIsArchivingChat(false);
    }
  }, [activeCustomer, customerMessages, isArchivingChat]);

  const archiveConsultation = useCallback((id: string) => {
    setConsultations((prev) =>
      prev.map((consultation) =>
        consultation.id === id
          ? { ...consultation, archived: true }
          : consultation,
      ),
    );
    archiveConsultationAction(id).catch((err) => {
      console.error(err);
      setConsultations((prev) =>
        prev.map((consultation) =>
          consultation.id === id
            ? { ...consultation, archived: false }
            : consultation,
        ),
      );
      setAiError(
        err instanceof Error
          ? err.message
          : "相談履歴のアーカイブに失敗しました。",
      );
    });
  }, []);

  const toggleAction = useCallback((id: string, completed: boolean) => {
    const completedAt = completed ? new Date().toISOString() : undefined;
    setNextActions((prev) =>
      prev.map((action) =>
        action.id === id ? { ...action, completed, completedAt } : action,
      ),
    );
    toggleNextActionAction(id, completed).catch(console.error);
  }, []);

  const updateActionResult = useCallback((id: string, resultNote: string) => {
    setNextActions((prev) =>
      prev.map((action) =>
        action.id === id ? { ...action, resultNote } : action,
      ),
    );
    updateNextActionResultAction(id, resultNote).catch(console.error);
  }, []);

  const addAction = useCallback(
    (label: string, priority: NextAction["priority"] = "medium") => {
      if (!activeCustomer) return;
      const action: NextAction = {
        id: `action-${Date.now()}`,
        customerId: activeCustomer.id,
        label,
        priority,
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

  const updateFtSummary = useCallback(
    async (ftSummary: string) => {
      if (!activeCustomer) return;
      const customerId = activeCustomer.id;
      const updatedAt = await updateCustomerFtSummaryAction(
        customerId,
        ftSummary,
      );
      setCustomers((prev) =>
        prev.map((customer) =>
          customer.id === customerId
            ? { ...customer, ftSummary: ftSummary.trim(), ftSummaryUpdatedAt: updatedAt }
            : customer,
        ),
      );
    },
    [activeCustomer],
  );

  const updateUserName = useCallback(async (name: string) => {
    const normalized = name.trim();
    if (!normalized) return;
    await updateWorkspaceUserNameAction(normalized);
    setWorkspaceState((prev) => ({
      ...prev,
      currentUser: { ...prev.currentUser, name: normalized },
    }));
  }, []);

  const { defaultLayout, onLayoutChanged } = useCsPaneLayout();

  if (!activeCustomer) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-muted-foreground">
        顧客データがありません
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-background text-foreground">
      <CsGlobalHeader workspace={workspaceState} onSaveUserName={updateUserName} />
      <ResizablePanelGroup
        id={CS_PANE_LAYOUT_STORAGE_ID}
        orientation="horizontal"
        defaultLayout={defaultLayout}
        onLayoutChanged={onLayoutChanged}
        className="min-h-0 flex-1"
      >
        <ResizablePanel
          id="customers"
          defaultSize={CS_PANE_SIZE.customers.defaultSize}
          minSize={CS_PANE_SIZE.customers.minSize}
          maxSize={CS_PANE_SIZE.customers.maxSize}
        >
          <CustomerListPane
            customers={customers}
            selectedCustomerId={selectedCustomerId}
            onSelectCustomer={selectCustomer}
            onAddCustomer={addCustomer}
            onArchiveCustomer={archiveCustomer}
            onDeleteCustomer={deleteCustomer}
          />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel
          id="summary"
          defaultSize={CS_PANE_SIZE.summary.defaultSize}
          minSize={CS_PANE_SIZE.summary.minSize}
          maxSize={CS_PANE_SIZE.summary.maxSize}
        >
          <CustomerSummaryPane
            customer={activeCustomer}
            consultations={customerConsultations}
            onArchiveConsultation={archiveConsultation}
            onUpdateFtSummary={updateFtSummary}
          />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel
          id="chat"
          defaultSize={CS_PANE_SIZE.chat.defaultSize}
          minSize={CS_PANE_SIZE.chat.minSize}
        >
          <AIChatPane
            key={activeCustomer.id}
            messages={customerMessages}
            onSendMessage={sendMessage}
            onStartGrillMe={startGrillMe}
            onArchiveSession={archiveChatSession}
            onDiscardSession={discardChatSession}
            onRequestLanding={requestLanding}
            onRequestIntent={requestConversationIntent}
            onAddActionFromLanding={addAction}
            isLoading={isAiLoading}
            isArchiving={isArchivingChat}
            isGeneratingLanding={isGeneratingLanding}
            streamingContent={streamingContent}
            errorMessage={aiError}
          />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel
          id="actions"
          defaultSize={CS_PANE_SIZE.actions.defaultSize}
          minSize={CS_PANE_SIZE.actions.minSize}
          maxSize={CS_PANE_SIZE.actions.maxSize}
        >
          <NextActionPane
            key={`actions-${activeCustomer.id}`}
            actions={customerActions}
            onToggleAction={toggleAction}
            onUpdateActionResult={updateActionResult}
            onAddAction={addAction}
            onDeleteAction={deleteAction}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
