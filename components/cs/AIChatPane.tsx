"use client";

import { useState } from "react";
import { Bot, Lightbulb, Send, Sparkles } from "lucide-react";

import { type ChatMessage } from "@/lib/cs-schema";
import { cn } from "@/lib/utils";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import { ScrollArea } from "@/components/ui/scroll-area";

type AIChatPaneProps = {
  messages: ChatMessage[];
  onSendMessage: (content: string) => void;
  onStartGrillMe: () => void;
};

export function AIChatPane({
  messages,
  onSendMessage,
  onStartGrillMe,
}: AIChatPaneProps) {
  const [draft, setDraft] = useState("");

  const handleSend = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onSendMessage(trimmed);
    setDraft("");
  };

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
                <p className="text-lg font-bold text-white">
                  上司役AIとの1on1
                </p>
                <p className="text-xs text-white/80">
                  あなたの悩みや課題に、上司目線で伴走します
                </p>
              </div>
            </div>

            {messages.map((message) => (
              <ChatBubble key={message.id} message={message} />
            ))}
          </div>
        </ScrollArea>

        {/* 入力エリア */}
        <div className="flex shrink-0 flex-col gap-3 border-t border-primary/20 bg-primary/10 p-4">
          <InputGroup className="h-auto min-h-10 bg-background">
            <InputGroupTextarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="メッセージを入力してください..."
              rows={2}
              aria-label="メッセージを入力"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <InputGroupAddon align="block-end" className="justify-end pb-2">
              <InputGroupButton
                variant="default"
                size="icon-sm"
                onClick={handleSend}
                disabled={!draft.trim()}
                aria-label="送信（Cmd+Enter）"
              >
                <Send aria-hidden />
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>

          {/* grill-me カード */}
          <button
            type="button"
            onClick={onStartGrillMe}
            className={cn(
              "flex items-center gap-3 rounded-xl bg-primary px-4 py-3 text-left transition-opacity",
              "hover:opacity-90",
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
                例を見て、話し始めるきっかけをつかみましょう
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
    <div
      className={cn(
        "flex gap-3",
        isUser ? "flex-row-reverse" : "flex-row",
      )}
    >
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
            "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
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
