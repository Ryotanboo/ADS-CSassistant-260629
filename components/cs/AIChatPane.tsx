"use client";

import { useState, useEffect, useRef } from "react";
import {
  AlertCircle,
  Bot,
  CheckCheck,
  Lightbulb,
  ListChecks,
  Loader2,
  Send,
  Sparkles,
  Waypoints,
} from "lucide-react";

import {
  type ChatMessage,
  type ConversationIntent,
  type LandingCard,
  type NextAction,
} from "@/lib/cs-schema";
import { CONVERSATION_INTENT_LABELS } from "@/lib/cs-conversation-intents";
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

type AIChatPaneProps = {
  messages: ChatMessage[];
  onSendMessage: (content: string) => void;
  onStartGrillMe: () => void;
  onArchiveSession: () => Promise<void>;
  onDiscardSession: () => Promise<void>;
  onRequestLanding: () => void;
  onRequestIntent: (intent: ConversationIntent) => void;
  onAddActionFromLanding: (label: string, priority: NextAction["priority"]) => void;
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
  onAddActionFromLanding,
  isLoading = false,
  isArchiving = false,
  isGeneratingLanding = false,
  streamingContent,
  errorMessage,
}: AIChatPaneProps) {
  const [draft, setDraft] = useState("");
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  // 着地カードから追加済みのアクションをラベルで管理（顧客切替時にリマウントでリセット）
  const [addedLabels, setAddedLabels] = useState<Set<string>>(new Set());
  const scrollBottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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

  const isBusy = isLoading || isGeneratingLanding || isArchiving;
  const hasMessages = messages.length > 0;

  return (
    <section className="flex min-w-0 flex-1 flex-col border-r border-border bg-background">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-primary/20 bg-primary/10 px-4">
        <Bot aria-hidden className="size-4 shrink-0 text-primary" />
        <h2 className="truncate text-sm font-semibold text-foreground">
          AIチャット
        </h2>
      </header>

      <div className="flex min-h-0 flex-1 flex-col">
        <ScrollArea className="min-h-0 flex-1">
          <div className="flex flex-col gap-5 p-5">
            {/* 1on1バナー */}
            <div className="relative flex flex-col items-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-chart-3 px-5 py-6 text-center">
              <div className="flex size-14 items-center justify-center rounded-full bg-white/20">
                <Sparkles aria-hidden className="size-7 text-white" />
              </div>
              <div className="flex flex-col gap-1.5">
                <p className="text-lg font-bold text-white">上司役AIとの1on1</p>
                <p className="text-xs text-white/80">
                  あなたの悩みや課題に、上司目線で伴走します
                </p>
              </div>
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
              ) : (
                <ChatBubble key={message.id} message={message} />
              ),
            )}

            {/* 会話の進行操作 */}
            {hasMessages && !isBusy ? (
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

            {/* ストリーミング中のAI応答バブル */}
            {isLoading && <StreamingBubble content={streamingContent} />}

            {/* 着地カード生成中 */}
            {isGeneratingLanding && <StreamingBubble content="" label="整理しています…" />}

            {/* エラー表示 */}
            {errorMessage && !isLoading && !isGeneratingLanding && (
              <ErrorBubble message={errorMessage} />
            )}

            <div ref={scrollBottomRef} />
          </div>
        </ScrollArea>

        {/* 入力エリア */}
        <div className="flex shrink-0 flex-col gap-3 border-t border-primary/20 bg-primary/10 p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              相談がまとまったら履歴に残せます
            </span>
            <div className="flex items-center gap-2">
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
          </div>

          <InputGroup className="h-auto min-h-10 bg-background">
            <InputGroupTextarea
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="メッセージを入力してください..."
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

          {/* grill-me カード */}
          <button
            type="button"
            onClick={() => {
              onStartGrillMe();
              requestAnimationFrame(() => {
                inputRef.current?.focus();
              });
            }}
            disabled={isLoading}
            className={cn(
              "flex items-center gap-3 rounded-xl bg-primary px-4 py-3 text-left transition-opacity",
              "hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50",
              "outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
            )}
          >
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/20">
              <Lightbulb aria-hidden className="size-4 text-white" />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-white">
                何から話せばいいか分からない
              </span>
              <span className="text-xs text-white/70">
                AIが最初の問いかけをしてくれます
              </span>
            </div>
          </button>
        </div>
      </div>
    </section>
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
                  すべてPane 4へ
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
