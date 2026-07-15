"use client";

import { useState } from "react";
import {
  Archive,
  Calendar,
  ClipboardPaste,
  Clock,
  Database,
  ExternalLink,
  MessageSquareText,
  MoreHorizontal,
  User,
  type LucideIcon,
} from "lucide-react";

import { type Consultation, type Customer } from "@/lib/cs-schema";
import { CONVERSATION_INTENT_LABELS } from "@/lib/cs-conversation-intents";
import {
  CONSULTATION_TYPE_LABELS,
  CUSTOMER_PHASE_LABELS,
} from "@/lib/cs-labels";
import { consultationBadgeVariant, phaseBadgeVariant } from "@/lib/cs-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";

type CustomerSummaryPaneProps = {
  customer: Customer;
  consultations: Consultation[];
  onArchiveConsultation: (id: string) => void;
  onUpdateFtSummary: (ftSummary: string) => Promise<void>;
};

export function CustomerSummaryPane({
  customer,
  consultations,
  onArchiveConsultation,
  onUpdateFtSummary,
}: CustomerSummaryPaneProps) {
  return (
    <section className="flex h-full min-h-0 w-full flex-col bg-background">
      <header className="flex h-12 shrink-0 items-center border-b border-border px-3">
        <h2 className="truncate text-sm font-semibold text-foreground">
          顧客サマリ
        </h2>
      </header>

      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-5 p-4">
          <div className="flex flex-col gap-2">
            <h3 className="text-base font-semibold text-foreground">
              {customer.name}
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">
                現在のフェーズ
              </span>
              <Badge variant={phaseBadgeVariant(customer.phase)} size="xs">
                {CUSTOMER_PHASE_LABELS[customer.phase]}
              </Badge>
            </div>
          </div>

          <Card size="sm" className="py-0">
            <CardContent className="flex flex-col gap-3 py-3">
              <SummaryRow
                icon={Calendar}
                label="契約開始日"
                value={customer.contractStartDate}
              />
              <Separator />
              <SummaryRow
                icon={User}
                label="社内の担当CS"
                value={customer.accountManager}
              />
            </CardContent>
          </Card>

          <FtSummaryCard
            customer={customer}
            onUpdateFtSummary={onUpdateFtSummary}
          />

          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Clock aria-hidden className="size-4 text-muted-foreground" />
              <h4 className="text-sm font-semibold text-foreground">
                相談履歴
              </h4>
            </div>

            <ol className="flex flex-col gap-4">
              {consultations.map((entry, index) => (
                <li key={entry.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span
                      className="size-2 shrink-0 rounded-full bg-primary"
                      aria-hidden
                    />
                    {index < consultations.length - 1 && (
                      <span
                        className="mt-1 w-px flex-1 bg-border"
                        aria-hidden
                      />
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5 pb-1">
                    <time className="text-xs text-muted-foreground">
                      {entry.date}
                    </time>
                    <Badge
                      variant={consultationBadgeVariant(entry.type)}
                      size="xs"
                    >
                      {CONSULTATION_TYPE_LABELS[entry.type]}
                    </Badge>
                    <p className="text-sm text-foreground">{entry.summary}</p>
                    <div className="flex items-center gap-1">
                      {entry.transcript && entry.transcript.length > 0 && (
                        <>
                          <ConsultationTranscriptDialog consultation={entry} />
                          <ConsultationMenu
                            consultation={entry}
                            onArchive={onArchiveConsultation}
                          />
                        </>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </ScrollArea>

      <footer className="shrink-0 border-t border-border p-3">
        <Button type="button" variant="outline" className="w-full">
          すべての履歴を見る
          <ExternalLink aria-hidden />
        </Button>
      </footer>
    </section>
  );
}

function extractFtHighlights(summary: string): string[] {
  return summary
    .split("\n")
    .map((line) => line.trim())
    .filter(
      (line) =>
        line.startsWith("- フェーズ:") ||
        line.startsWith("- 担当:") ||
        line.startsWith("- FT残り:") ||
        line.startsWith("- シグナル:"),
    )
    .map((line) => line.replace(/^- /, "").replace(/\*\*/g, ""))
    .slice(0, 4);
}

function formatUpdatedAt(value?: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function FtSummaryCard({
  customer,
  onUpdateFtSummary,
}: {
  customer: Customer;
  onUpdateFtSummary: (ftSummary: string) => Promise<void>;
}) {
  const [importOpen, setImportOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const summary = customer.ftSummary ?? "";
  const highlights = extractFtHighlights(summary);
  const updatedAt = formatUpdatedAt(customer.ftSummaryUpdatedAt);

  const handleImport = async (formData: FormData) => {
    const nextSummary = String(formData.get("ftSummary") ?? "").trim();
    if (!nextSummary) return;
    setIsSaving(true);
    try {
      await onUpdateFtSummary(nextSummary);
      setImportOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle emphasis="prominent">
          <span className="flex items-center gap-2">
            <Database aria-hidden className="size-4 text-primary" />
            FT勝ち筋サマリ
          </span>
        </CardTitle>
        <CardDescription>
          {updatedAt ? `最終取り込み ${updatedAt}` : "まだ取り込まれていません"}
        </CardDescription>
        <CardAction>
          <Dialog open={importOpen} onOpenChange={setImportOpen}>
            <DialogTrigger
              render={<Button type="button" variant="outline" size="sm" />}
            >
              <ClipboardPaste aria-hidden />
              {summary ? "更新" : "取り込む"}
            </DialogTrigger>
            <DialogContent>
              <form action={handleImport} className="flex flex-col gap-5">
                <DialogHeader>
                  <DialogTitle>FT勝ち筋サマリを取り込む</DialogTitle>
                  <DialogDescription>
                    FT勝ち筋ナビの「Notion用にコピー」で取得した内容を貼り付けます。
                  </DialogDescription>
                </DialogHeader>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor={`ft-summary-${customer.id}`}>
                      Notion用サマリ
                    </FieldLabel>
                    <Textarea
                      key={`${customer.id}-${customer.ftSummaryUpdatedAt ?? "empty"}`}
                      id={`ft-summary-${customer.id}`}
                      name="ftSummary"
                      defaultValue={summary}
                      placeholder="FT勝ち筋ナビでコピーした内容を貼り付け"
                      className="min-h-64"
                      required
                      autoFocus
                    />
                    <FieldDescription>
                      既存の内容がある場合は、貼り付けた内容で更新されます。
                    </FieldDescription>
                  </Field>
                </FieldGroup>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setImportOpen(false)}
                  >
                    キャンセル
                  </Button>
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? "保存中" : "取り込む"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardAction>
      </CardHeader>
      {summary ? (
        <CardContent className="flex flex-col gap-3">
          {highlights.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {highlights.map((highlight) => (
                <li key={highlight} className="text-sm text-foreground">
                  {highlight}
                </li>
              ))}
            </ul>
          ) : (
            <p className="line-clamp-4 text-sm whitespace-pre-wrap text-foreground">
              {summary}
            </p>
          )}
          <Dialog>
            <DialogTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="self-start"
                />
              }
            >
              全文を見る
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>FT勝ち筋サマリ</DialogTitle>
                <DialogDescription>
                  取り込んだNotion用サマリの全文です。
                </DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[65vh]">
                <pre className="pr-3 font-sans text-sm whitespace-pre-wrap text-foreground">
                  {summary}
                </pre>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </CardContent>
      ) : null}
    </Card>
  );
}

function ConsultationMenu({
  consultation,
  onArchive,
}: {
  consultation: Consultation;
  onArchive: (id: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={`${consultation.summary} の操作`}
          />
        }
      >
        <MoreHorizontal aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="start">
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => onArchive(consultation.id)}>
            <Archive aria-hidden />
            アーカイブ
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ConsultationTranscriptDialog({
  consultation,
}: {
  consultation: Consultation;
}) {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="self-start"
          />
        }
      >
        <MessageSquareText aria-hidden />
        元チャットを見る
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{consultation.summary}</DialogTitle>
          <DialogDescription>
            {consultation.date} の相談ログです。
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          <div className="flex flex-col gap-3 pr-3">
            {consultation.transcript?.map((message) => (
              <div
                key={message.id}
                className="flex flex-col gap-1 rounded-lg bg-card p-3 ring-1 ring-border"
              >
                <span className="text-xs text-muted-foreground">
                  {message.kind === "intent"
                    ? "進行操作"
                    : message.kind === "proposal_document"
                      ? "提案文書"
                      : message.kind === "proposal_question"
                        ? "提案の問い"
                        : message.role === "user"
                          ? "担当CS"
                          : "上司役AI"}
                  {message.timestamp ? `・${message.timestamp}` : ""}
                </span>
                <p className="text-sm whitespace-pre-wrap text-foreground">
                  {message.kind === "intent" && message.intent
                    ? CONVERSATION_INTENT_LABELS[message.intent]
                    : message.content}
                </p>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function SummaryRow({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon
        aria-hidden
        className="mt-0.5 size-4 shrink-0 text-muted-foreground"
      />
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-sm text-foreground">{value}</span>
      </div>
    </div>
  );
}
