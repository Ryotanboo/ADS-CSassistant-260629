"use client";

import { useState, useEffect, useRef } from "react";
import {
  AlertCircle,
  Bot,
  Check,
  CheckCheck,
  ChevronRight,
  Copy,
  FilePenLine,
  Lightbulb,
  ListChecks,
  Loader2,
  Mic,
  Send,
  Sparkles,
  Waypoints,
  X,
} from "lucide-react";

import {
  type ChatMessage,
  type ConversationIntent,
  type LandingCard,
  type NextAction,
  type PresentationQuestionCard,
  type ProposalAudience,
  type ProposalQuestionCard,
} from "@/lib/cs-schema";
import { CONVERSATION_INTENT_LABELS } from "@/lib/cs-conversation-intents";
import { getExitCtaState } from "@/lib/cs-exit-cta";
import { NEXT_ACTION_PRIORITY_LABELS } from "@/lib/cs-labels";
import { priorityBadgeVariant } from "@/lib/cs-badges";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

type ArtifactPinTab = "proposal" | "script";

type AIChatPaneProps = {
  messages: ChatMessage[];
  onSendMessage: (content: string) => void;
  onStartGrillMe: () => void;
  onArchiveSession: () => Promise<void>;
  onDiscardSession: () => Promise<void>;
  onRequestLanding: () => void;
  onRequestIntent: (intent: ConversationIntent) => void;
  onStartProposalMode: () => void;
  onExitProposalMode: () => void;
  onStartPresentationMode: () => void;
  onExitPresentationMode: () => void;
  onAddActionFromLanding: (label: string, priority: NextAction["priority"]) => void;
  proposalMode?: boolean;
  presentationMode?: boolean;
  proposalAudience?: ProposalAudience | null;
  hasPendingActions?: boolean;
  latestProposalDocument?: ChatMessage | null;
  latestPresentationScript?: ChatMessage | null;
  isLoading?: boolean;
  isArchiving?: boolean;
  isGeneratingLanding?: boolean;
  streamingContent?: string;
  errorMessage?: string | null;
};

export function AIChatPane({
  messages,
  onSendMessage,
  onStartGrillMe,
  onArchiveSession,
  onDiscardSession,
  onRequestLanding,
  onRequestIntent,
  onStartProposalMode,
  onExitProposalMode,
  onStartPresentationMode,
  onExitPresentationMode,
  onAddActionFromLanding,
  proposalMode = false,
  presentationMode = false,
  proposalAudience = null,
  hasPendingActions = false,
  latestProposalDocument = null,
  latestPresentationScript = null,
  isLoading = false,
  isArchiving = false,
  isGeneratingLanding = false,
  streamingContent,
  errorMessage,
}: AIChatPaneProps) {
  const [draft, setDraft] = useState("");
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  // 着地カードから追加済みのアクションをラベルで管理（顧客切替時にリマウントでリセット）
  const [addedLabels, setAddedLabels] = useState<Set<string>>(new Set());
  const scrollBottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const facilitatorMode = proposalMode || presentationMode;

  // 新しいメッセージ追加・ストリーミング更新時に最下部へスクロール
  useEffect(() => {
    scrollBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent, isGeneratingLanding]);

  useEffect(() => {
    if (!isLoading && !isGeneratingLanding && !archiveDialogOpen) {
      inputRef.current?.focus();
    }
  }, [isLoading, isGeneratingLanding, archiveDialogOpen, messages.length]);

  const handleSend = () => {
    const trimmed = draft.trim();
    if (!trimmed || isLoading) return;
    onSendMessage(trimmed);
    setDraft("");
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  };

  const handleSelectOption = (label: string) => {
    if (isLoading) return;
    setDraft("");
    onSendMessage(label);
  };

  const handleAddFromLanding = (label: string, priority: NextAction["priority"]) => {
    onAddActionFromLanding(label, priority);
    setAddedLabels((prev) => new Set([...prev, label]));
  };

  const handleAddAllFromLanding = (card: LandingCard) => {
    card.nextActions.forEach((action) => {
      if (!addedLabels.has(action.label)) {
        handleAddFromLanding(action.label, action.priority);
      }
    });
  };

  const handleArchiveSession = async () => {
    await onArchiveSession();
    setArchiveDialogOpen(false);
  };

  const handleDiscardSession = async () => {
    await onDiscardSession();
    setArchiveDialogOpen(false);
  };

  const handleCopyArtifact = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const isBusy = isLoading || isGeneratingLanding || isArchiving;
  const hasMessages = messages.length > 0;
  const exitCta = getExitCtaState({
    chatMode: presentationMode
      ? "presentation"
      : proposalMode
        ? "proposal"
        : "normal",
    hasPendingActions,
    hasProposalDocument: latestProposalDocument != null,
  });
  const canStartPresentation = exitCta.showPresentation;

  const defaultPinTab = ((): ArtifactPinTab => {
    if (!latestProposalDocument && latestPresentationScript) return "script";
    if (!latestPresentationScript) return "proposal";
    if (!latestProposalDocument) return "script";
    const proposalIndex = messages.findIndex(
      (m) => m.id === latestProposalDocument.id,
    );
    const scriptIndex = messages.findIndex(
      (m) => m.id === latestPresentationScript.id,
    );
    return scriptIndex >= proposalIndex ? "script" : "proposal";
  })();

  const latestProposalQuestion = (() => {
    if (!proposalMode || isBusy) return null;
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      if (message.kind === "proposal_question" && message.proposalCard) {
        const answered = messages.slice(i + 1).some((m) => m.role === "user");
        if (!answered) return message;
        return null;
      }
      if (message.kind === "proposal_document") return null;
    }
    return null;
  })();

  const latestPresentationQuestion = (() => {
    if (!presentationMode || isBusy) return null;
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      if (
        message.kind === "presentation_question" &&
        message.presentationCard
      ) {
        const answered = messages.slice(i + 1).some((m) => m.role === "user");
        if (!answered) return message;
        return null;
      }
      if (message.kind === "presentation_script") return null;
    }
    return null;
  })();

  const showArtifactPin =
    latestProposalDocument != null || latestPresentationScript != null;

  return (
    <section className="flex h-full min-h-0 w-full flex-col bg-canvas">
      <header
        className={cn(
          "flex h-12 shrink-0 items-center gap-2 border-b px-4",
          presentationMode
            ? "border-accent/40 bg-accent/20"
            : proposalMode
              ? "border-opportunity/30 bg-opportunity/10"
              : "border-border bg-background",
        )}
      >
        {presentationMode ? (
          <Mic aria-hidden className="size-4 shrink-0 text-accent-foreground" />
        ) : proposalMode ? (
          <FilePenLine
            aria-hidden
            className="size-4 shrink-0 text-opportunity"
          />
        ) : (
          <Bot aria-hidden className="size-4 shrink-0 text-muted-foreground" />
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h2 className="truncate text-sm font-semibold text-foreground">
            {presentationMode
              ? "プレゼンモード"
              : proposalMode
                ? "提案モード"
                : "AIチャット"}
          </h2>
          {presentationMode ? (
            <p className="truncate text-xs text-muted-foreground">
              読み上げ原稿を整えています（スライドは作りません）
            </p>
          ) : proposalMode ? (
            <p className="truncate text-xs text-muted-foreground">
              通す相手と伝え方を固めています
            </p>
          ) : null}
        </div>
        {proposalMode && proposalAudience ? (
          <Badge variant="outline" size="xs">
            {proposalAudience === "customer" ? "顧客向け" : "社内向け"}
          </Badge>
        ) : null}
        {proposalMode ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onExitProposalMode}
            disabled={isBusy}
          >
            <X aria-hidden />
            通常に戻る
          </Button>
        ) : null}
        {presentationMode ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onExitPresentationMode}
            disabled={isBusy}
          >
            <X aria-hidden />
            通常に戻る
          </Button>
        ) : null}
      </header>

      <div className="flex min-h-0 flex-1 flex-col">
        <ScrollArea className="min-h-0 flex-1">
          <div className="flex flex-col gap-5 p-5">
            {/* 1on1バナー */}
            <div
              className={cn(
                "rounded-xl p-px",
                presentationMode
                  ? "bg-accent/40"
                  : proposalMode
                    ? "bg-opportunity/25"
                    : "bg-opportunity/15",
              )}
            >
              <Card size="sm" className="border-0 shadow-none">
                <CardContent className="flex items-center gap-3 px-4 py-4">
                  <div
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-lg",
                      presentationMode
                        ? "bg-accent/30"
                        : "bg-opportunity/15",
                    )}
                  >
                    {presentationMode ? (
                      <Mic
                        aria-hidden
                        className="size-5 text-accent-foreground"
                      />
                    ) : proposalMode ? (
                      <FilePenLine
                        aria-hidden
                        className="size-5 text-opportunity"
                      />
                    ) : (
                      <Sparkles
                        aria-hidden
                        className="size-5 text-opportunity"
                      />
                    )}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <p className="text-sm font-semibold">
                      {presentationMode
                        ? "読み上げ原稿の作成を伴走します"
                        : proposalMode
                          ? "提案文書の作成を伴走します"
                          : "上司役AIとの1on1"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {presentationMode
                        ? "体験談は創作しません。見た場面を一緒に掘ります"
                        : proposalMode
                          ? "選択肢で答えながら、通る提案文に整えます"
                          : "あなたの悩みや課題に、上司目線で伴走します"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {messages.map((message) =>
              message.kind === "landing" && message.card ? (
                <LandingCardBubble
                  key={message.id}
                  card={message.card}
                  addedLabels={addedLabels}
                  onAddAction={handleAddFromLanding}
                  onAddAll={handleAddAllFromLanding}
                />
              ) : message.kind === "intent" && message.intent ? (
                <IntentBubble
                  key={message.id}
                  intent={message.intent}
                  timestamp={message.timestamp}
                />
              ) : message.kind === "proposal_document" ? (
                <ProposalDocumentBubble
                  key={message.id}
                  content={message.content}
                  timestamp={message.timestamp}
                  onCopy={() => handleCopyArtifact(message.content)}
                />
              ) : message.kind === "proposal_question" ? (
                <ProposalQuestionBubble
                  key={message.id}
                  content={message.content}
                  timestamp={message.timestamp}
                />
              ) : message.kind === "presentation_script" ? (
                <PresentationScriptBubble
                  key={message.id}
                  content={message.content}
                  timestamp={message.timestamp}
                  onCopy={() => handleCopyArtifact(message.content)}
                />
              ) : message.kind === "presentation_question" ? (
                <PresentationQuestionBubble
                  key={message.id}
                  content={message.content}
                  timestamp={message.timestamp}
                />
              ) : (
                <ChatBubble key={message.id} message={message} />
              ),
            )}

            {/* 通常モードの進行操作（提案／プレゼン中は隠す） */}
            {hasMessages && !isBusy && !facilitatorMode ? (
              <div className="flex flex-wrap gap-2 pl-11">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onRequestIntent("perspective")}
                >
                  <Waypoints aria-hidden />
                  別の視点を出す
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onRequestIntent("actions")}
                >
                  <Lightbulb aria-hidden />
                  打ち手を考える
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onRequestLanding}
                >
                  <ListChecks aria-hidden />
                  ここまでを整理
                </Button>
              </div>
            ) : null}

            {/* 提案／プレゼン: 選択肢（ストリーム完了後の未回答質問のみ） */}
            {latestProposalQuestion?.proposalCard ? (
              <FacilitatorOptions
                card={latestProposalQuestion.proposalCard}
                disabled={isBusy}
                onSelect={handleSelectOption}
              />
            ) : null}
            {latestPresentationQuestion?.presentationCard ? (
              <FacilitatorOptions
                card={latestPresentationQuestion.presentationCard}
                disabled={isBusy}
                onSelect={handleSelectOption}
              />
            ) : null}

            {/* ストリーミング中のAI応答バブル */}
            {isLoading && (
              <StreamingBubble
                content={streamingContent}
                label={
                  presentationMode
                    ? "原稿を整えています…"
                    : proposalMode
                      ? "提案を整えています…"
                      : "考えています…"
                }
              />
            )}

            {/* 着地カード生成中 */}
            {isGeneratingLanding && (
              <StreamingBubble content="" label="整理しています…" />
            )}

            {/* エラー表示 */}
            {errorMessage && !isLoading && !isGeneratingLanding && (
              <ErrorBubble message={errorMessage} />
            )}

            <div ref={scrollBottomRef} />
          </div>
        </ScrollArea>

        {/* 入力エリア */}
        <div className="flex shrink-0 flex-col gap-3 border-t border-border bg-background p-4">
          {/* 成果物ピン（提案／原稿を1枠で切替） */}
          {showArtifactPin ? (
            <ArtifactPin
              key={`${latestProposalDocument?.id ?? "none"}:${latestPresentationScript?.id ?? "none"}`}
              defaultTab={defaultPinTab}
              proposalDocument={latestProposalDocument}
              presentationScript={latestPresentationScript}
              copied={copied}
              onCopy={handleCopyArtifact}
            />
          ) : null}

          <div className="flex items-center justify-end gap-2">
              {exitCta.showProposal ? (
                <Button
                  type="button"
                  variant={exitCta.proposalEmphasized ? "default" : "outline"}
                  size="sm"
                  onClick={onStartProposalMode}
                  disabled={isBusy}
                  title="書いて通す提案文書を作ります"
                >
                  <FilePenLine aria-hidden />
                  提案を作る
                </Button>
              ) : null}
              {canStartPresentation ? (
                <Button
                  type="button"
                  variant="accent"
                  size="sm"
                  onClick={onStartPresentationMode}
                  disabled={isBusy}
                  title="話して通す読み上げ原稿を作ります（スライドは別）"
                >
                  <Mic aria-hidden />
                  プレゼンを作る
                </Button>
              ) : null}
              <AlertDialog
                open={archiveDialogOpen}
                onOpenChange={setArchiveDialogOpen}
              >
                <AlertDialogTrigger
                  render={
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isBusy || !hasMessages}
                    />
                  }
                >
                  {isArchiving ? "保存中" : "相談を終了"}
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>相談を履歴に残しますか？</AlertDialogTitle>
                    <AlertDialogDescription>
                      現在のチャットを相談履歴に保存するか、保存せずにチャット欄だけ空にできます。
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>キャンセル</AlertDialogCancel>
                    <AlertDialogAction
                      variant="outline"
                      onClick={handleDiscardSession}
                      disabled={isArchiving}
                    >
                      履歴に残さない
                    </AlertDialogAction>
                    <AlertDialogAction
                      onClick={handleArchiveSession}
                      disabled={isArchiving}
                    >
                      履歴に残す
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
          </div>

          <InputGroup className="h-auto min-h-10 bg-background">
            <InputGroupTextarea
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={
                presentationMode
                  ? "見た場面や心の声を入力..."
                  : proposalMode
                    ? "その他の回答を入力..."
                    : "メッセージを入力してください..."
              }
              rows={2}
              aria-label="メッセージを入力"
              disabled={isLoading}
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  !e.shiftKey &&
                  !e.nativeEvent.isComposing
                ) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <InputGroupAddon align="block-end" className="justify-end pb-2">
              {isLoading ? (
                <div className="flex size-7 items-center justify-center">
                  <Loader2
                    aria-hidden
                    className="size-4 animate-spin text-muted-foreground"
                  />
                </div>
              ) : (
                <InputGroupButton
                  variant="default"
                  size="icon-sm"
                  onClick={handleSend}
                  disabled={!draft.trim()}
                  aria-label="送信（Enter）"
                >
                  <Send aria-hidden />
                </InputGroupButton>
              )}
            </InputGroupAddon>
          </InputGroup>

          {/* grill-me カード（提案／プレゼン中は隠す） */}
          {!facilitatorMode ? (
            <Button
              type="button"
              variant="accent"
              className="h-auto w-full justify-start gap-3 px-3 py-2.5"
              onClick={() => {
                onStartGrillMe();
                requestAnimationFrame(() => {
                  inputRef.current?.focus();
                });
              }}
              disabled={isLoading}
            >
              <Lightbulb aria-hidden />
              <span className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
                <span>何から話せばいいか分からない</span>
                <span className="text-xs font-normal opacity-80">
                  AIが最初の問いかけをしてくれます
                </span>
              </span>
              <ChevronRight aria-hidden className="opacity-80" />
            </Button>
          ) : null}

          <p className="text-center text-xs text-muted-foreground">
            AIの回答は必ずしも正確とは限りません。内容はご自身で確認のうえご判断ください。
          </p>
        </div>
      </div>
    </section>
  );
}

function ArtifactPin({
  defaultTab,
  proposalDocument,
  presentationScript,
  copied,
  onCopy,
}: {
  defaultTab: ArtifactPinTab;
  proposalDocument: ChatMessage | null;
  presentationScript: ChatMessage | null;
  copied: boolean;
  onCopy: (content: string) => void;
}) {
  const [pinTab, setPinTab] = useState<ArtifactPinTab>(defaultTab);
  const activePinDocument =
    pinTab === "script" ? presentationScript : proposalDocument;

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-2">
        {proposalDocument ? (
          <Button
            type="button"
            variant={pinTab === "proposal" ? "default" : "outline"}
            size="xs"
            onClick={() => setPinTab("proposal")}
          >
            提案
          </Button>
        ) : null}
        {presentationScript ? (
          <Button
            type="button"
            variant={pinTab === "script" ? "default" : "outline"}
            size="xs"
            onClick={() => setPinTab("script")}
          >
            原稿
          </Button>
        ) : null}
      </div>
      {activePinDocument ? (
        <div className="flex items-start gap-2">
          {pinTab === "script" ? (
            <Mic
              aria-hidden
              className="mt-0.5 size-4 shrink-0 text-accent-foreground"
            />
          ) : (
            <FilePenLine
              aria-hidden
              className="mt-0.5 size-4 shrink-0 text-opportunity"
            />
          )}
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">
              {pinTab === "script" ? "最新の読み上げ原稿" : "最新の提案"}
            </span>
            <p className="line-clamp-2 text-sm text-foreground">
              {activePinDocument.content.split("\n")[0]}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onCopy(activePinDocument.content)}
          >
            {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
            {copied ? "コピー済み" : "コピー"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function FacilitatorOptions({
  card,
  disabled,
  onSelect,
}: {
  card: ProposalQuestionCard | PresentationQuestionCard;
  disabled: boolean;
  onSelect: (label: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2 pl-11">
      <span className="text-xs text-muted-foreground">選択肢（推奨つき）</span>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {card.options.map((option) => {
          const isRecommended = option.id === card.recommended;
          return (
            <Button
              key={option.id}
              type="button"
              variant={isRecommended ? "default" : "outline"}
              size="sm"
              disabled={disabled}
              onClick={() => onSelect(option.label)}
              className="justify-start"
            >
              {isRecommended ? (
                <span className="text-xs opacity-80">推奨</span>
              ) : null}
              {option.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

function ProposalQuestionBubble({
  content,
  timestamp,
}: {
  content: string;
  timestamp?: string;
}) {
  return (
    <div className="flex gap-3">
      <div
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-opportunity/15"
        aria-hidden
      >
        <FilePenLine className="size-4 text-opportunity" />
      </div>
      <div className="flex max-w-[82%] flex-col items-start gap-1">
        <div className="rounded-2xl rounded-tl-sm bg-card px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap text-foreground ring-1 ring-border">
          {content}
        </div>
        {timestamp ? (
          <time className="text-xs text-muted-foreground">{timestamp}</time>
        ) : null}
      </div>
    </div>
  );
}

function ProposalDocumentBubble({
  content,
  timestamp,
  onCopy,
}: {
  content: string;
  timestamp?: string;
  onCopy: () => void;
}) {
  return (
    <div className="flex gap-3">
      <div
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-opportunity/15"
        aria-hidden
      >
        <FilePenLine className="size-4 text-opportunity" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between gap-2 border-b border-border bg-opportunity/10 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <FilePenLine aria-hidden className="size-4 text-opportunity" />
              <span className="text-sm font-semibold text-foreground">
                提案文書
              </span>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={onCopy}>
              <Copy aria-hidden />
              コピー
            </Button>
          </div>
          <CardContent className="p-4">
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">
              {content}
            </pre>
          </CardContent>
        </Card>
        {timestamp ? (
          <time className="text-xs text-muted-foreground">{timestamp}</time>
        ) : null}
      </div>
    </div>
  );
}

function PresentationQuestionBubble({
  content,
  timestamp,
}: {
  content: string;
  timestamp?: string;
}) {
  return (
    <div className="flex gap-3">
      <div
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent/30"
        aria-hidden
      >
        <Mic className="size-4 text-accent-foreground" />
      </div>
      <div className="flex max-w-[82%] flex-col items-start gap-1">
        <div className="rounded-2xl rounded-tl-sm bg-card px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap text-foreground ring-1 ring-border">
          {content}
        </div>
        {timestamp ? (
          <time className="text-xs text-muted-foreground">{timestamp}</time>
        ) : null}
      </div>
    </div>
  );
}

function PresentationScriptBubble({
  content,
  timestamp,
  onCopy,
}: {
  content: string;
  timestamp?: string;
  onCopy: () => void;
}) {
  return (
    <div className="flex gap-3">
      <div
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent/30"
        aria-hidden
      >
        <Mic className="size-4 text-accent-foreground" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between gap-2 border-b border-border bg-accent/20 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <Mic aria-hidden className="size-4 text-accent-foreground" />
              <span className="text-sm font-semibold text-foreground">
                読み上げ原稿
              </span>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={onCopy}>
              <Copy aria-hidden />
              コピー
            </Button>
          </div>
          <CardContent className="p-4">
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">
              {content}
            </pre>
          </CardContent>
        </Card>
        {timestamp ? (
          <time className="text-xs text-muted-foreground">{timestamp}</time>
        ) : null}
      </div>
    </div>
  );
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-3", isUser ? "flex-row-reverse" : "flex-row")}>
      {!isUser && (
        <div
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15"
          aria-hidden
        >
          <Bot className="size-4 text-primary" />
        </div>
      )}
      <div
        className={cn(
          "flex max-w-[82%] flex-col gap-1",
          isUser ? "items-end" : "items-start",
        )}
      >
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
            isUser
              ? "rounded-tr-sm bg-primary text-primary-foreground"
              : "rounded-tl-sm bg-card text-foreground ring-1 ring-border",
          )}
        >
          {message.content}
        </div>
        {message.timestamp && (
          <time className="text-xs text-muted-foreground">
            {message.timestamp}
          </time>
        )}
      </div>
    </div>
  );
}

function IntentBubble({
  intent,
  timestamp,
}: {
  intent: ConversationIntent;
  timestamp?: string;
}) {
  return (
    <div className="flex flex-col items-end gap-1">
      <Badge variant="outline">
        進行操作: {CONVERSATION_INTENT_LABELS[intent]}
      </Badge>
      {timestamp ? (
        <time className="text-xs text-muted-foreground">{timestamp}</time>
      ) : null}
    </div>
  );
}

function LandingCardBubble({
  card,
  addedLabels,
  onAddAction,
  onAddAll,
}: {
  card: LandingCard;
  addedLabels: Set<string>;
  onAddAction: (label: string, priority: NextAction["priority"]) => void;
  onAddAll: (card: LandingCard) => void;
}) {
  const allAdded = card.nextActions.every((a) => addedLabels.has(a.label));

  return (
    <div className="flex gap-3">
      <div
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15"
        aria-hidden
      >
        <ListChecks className="size-4 text-primary" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Card className="overflow-hidden">
          {/* カードヘッダー */}
          <div className="flex items-center justify-between gap-2 border-b border-border bg-primary/10 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <Sparkles aria-hidden className="size-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">
                ここまでの整理
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onAddAll(card)}
              disabled={allAdded}
            >
              {allAdded ? (
                <>
                  <CheckCheck aria-hidden className="size-3.5" />
                  すべて追加済み
                </>
              ) : (
                <>
                  <ListChecks aria-hidden className="size-3.5" />
                  すべてネクストアクションへ
                </>
              )}
            </Button>
          </div>

          <CardContent className="flex flex-col gap-4 p-4">
            {/* 整理できたこと */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                整理できたこと
              </span>
              <ul className="flex flex-col gap-1.5">
                {card.summary.map((item, i) => (
                  <li key={i} className="flex gap-2 text-sm text-foreground">
                    <span
                      className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary"
                      aria-hidden
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* 未確認事項 */}
            {card.openQuestions.length > 0 && (
              <>
                <Separator />
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    未確認事項
                  </span>
                  <ul className="flex flex-col gap-1.5">
                    {card.openQuestions.map((item, i) => (
                      <li
                        key={i}
                        className="flex gap-2 text-sm text-muted-foreground"
                      >
                        <span
                          className="mt-1.5 size-1.5 shrink-0 rounded-full bg-muted-foreground/40"
                          aria-hidden
                        />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}

            {/* 次にやること */}
            <Separator />
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                次にやること
              </span>
              <ul className="flex flex-col gap-2">
                {card.nextActions.map((action, i) => {
                  const added = addedLabels.has(action.label);
                  return (
                    <li key={i} className="flex items-start gap-2">
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <span
                          className={cn(
                            "text-sm text-foreground",
                            added && "text-muted-foreground line-through",
                          )}
                        >
                          {action.label}
                        </span>
                        <Badge
                          variant={priorityBadgeVariant(action.priority)}
                          size="xs"
                        >
                          {NEXT_ACTION_PRIORITY_LABELS[action.priority]}
                        </Badge>
                      </div>
                      <Button
                        type="button"
                        variant={added ? "outline" : "default"}
                        size="sm"
                        onClick={() => onAddAction(action.label, action.priority)}
                        disabled={added}
                        className="shrink-0"
                      >
                        {added ? "追加済み" : "追加"}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StreamingBubble({
  content,
  label = "考えています…",
}: {
  content?: string;
  label?: string;
}) {
  return (
    <div className="flex gap-3">
      <div
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15"
        aria-hidden
      >
        <Bot className="size-4 text-primary" />
      </div>
      <div className="flex max-w-[82%] flex-col items-start gap-1">
        <div className="rounded-2xl rounded-tl-sm bg-card px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap text-foreground ring-1 ring-border">
          {content ? (
            <>
              {content}
              <span className="ml-0.5 inline-block h-3.5 w-0.5 animate-pulse bg-primary align-text-bottom" />
            </>
          ) : (
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Loader2 aria-hidden className="size-3.5 animate-spin" />
              {label}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function ErrorBubble({ message }: { message: string }) {
  return (
    <div className="flex gap-3">
      <div
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-destructive/15"
        aria-hidden
      >
        <AlertCircle className="size-4 text-destructive" />
      </div>
      <div className="flex max-w-[82%] flex-col items-start gap-1">
        <div className="rounded-2xl rounded-tl-sm bg-destructive/10 px-4 py-2.5 text-sm leading-relaxed text-destructive ring-1 ring-destructive/30">
          {message}
        </div>
      </div>
    </div>
  );
}
