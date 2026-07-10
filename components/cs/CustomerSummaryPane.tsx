"use client";

import {
  Archive,
  Calendar,
  Clock,
  ExternalLink,
  MessageSquareText,
  MoreHorizontal,
  User,
  type LucideIcon,
} from "lucide-react";

import { type Consultation, type Customer } from "@/lib/cs-schema";
import {
  CONSULTATION_TYPE_LABELS,
  CUSTOMER_PHASE_LABELS,
} from "@/lib/cs-labels";
import { consultationBadgeVariant, phaseBadgeVariant } from "@/lib/cs-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

type CustomerSummaryPaneProps = {
  customer: Customer;
  consultations: Consultation[];
  onArchiveConsultation: (id: string) => void;
};

export function CustomerSummaryPane({
  customer,
  consultations,
  onArchiveConsultation,
}: CustomerSummaryPaneProps) {
  return (
    <section className="flex w-[300px] shrink-0 flex-col border-r border-border bg-background">
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
                label="アカウントマネージャー"
                value={customer.accountManager}
              />
            </CardContent>
          </Card>

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
          <DropdownMenuItem onSelect={() => onArchive(consultation.id)}>
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
                  {message.role === "user" ? "担当CS" : "上司役AI"}
                  {message.timestamp ? `・${message.timestamp}` : ""}
                </span>
                <p className="text-sm whitespace-pre-wrap text-foreground">
                  {message.content}
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
