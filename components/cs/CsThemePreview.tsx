import Link from "next/link";
import {
  Bell,
  Bot,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  CircleUserRound,
  Clock3,
  GripVertical,
  Lightbulb,
  ListChecks,
  Search,
  Send,
  Sparkles,
  UserRound,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import { Separator } from "@/components/ui/separator";

const previewThemes = {
  "stories-contrast": {
    label: "Stories Contrast",
    description: "黒ヘッダー×ゴールド強調×青アクセント",
    className: "cs-preview-stories-contrast",
  },
  "stories-light": {
    label: "Stories Light",
    description: "白ヘッダー×黒文字×青アクセント（参考サイト準拠）",
    className: "cs-preview-stories-light",
  },
} as const;

export type CsPreviewTheme = keyof typeof previewThemes;

export function isCsPreviewTheme(
  value: string | undefined,
): value is CsPreviewTheme {
  return value !== undefined && value in previewThemes;
}

const customers = [
  {
    name: "株式会社ABC",
    phase: "導入中",
    variant: "phase-onboarding" as const,
  },
  {
    name: "株式会社DEF",
    phase: "活用定着",
    variant: "phase-adoption" as const,
  },
  {
    name: "株式会社GHI",
    phase: "サクセス済",
    variant: "phase-success" as const,
  },
  {
    name: "株式会社JKL",
    phase: "サクセス済",
    variant: "phase-success" as const,
  },
  {
    name: "株式会社MNO",
    phase: "活用定着",
    variant: "phase-adoption" as const,
  },
];

const consultations = [
  {
    date: "2026/07/06",
    type: "課題整理",
    summary: "人事連携の必須要件と背景を整理",
  },
  {
    date: "2026/06/28",
    type: "打ち手",
    summary: "オンボーディングの代替案を検討",
  },
  {
    date: "2026/06/14",
    type: "課題整理",
    summary: "導入スケジュールのリスクを確認",
  },
];

const actions = [
  {
    label: "人事連携が必須となる背景ニーズを確認する",
    priority: "高",
    completed: false,
  },
  {
    label: "代替運用の許容条件を社内で整理する",
    priority: "高",
    completed: false,
  },
  {
    label: "担当者と次回MTGの日程を設定する",
    priority: "中",
    completed: true,
  },
];

export function CsThemePreview({ theme }: { theme: CsPreviewTheme }) {
  const selected = previewThemes[theme];

  return (
    <main
      className={cn(
        selected.className,
        "h-screen min-w-[1280px] overflow-hidden bg-background text-foreground",
      )}
    >
      <div className="flex h-full flex-col">
        <GlobalHeader theme={theme} />
        <div className="flex min-h-0 flex-1">
          <CustomerPane />
          <ResizeDivider label="顧客リストと顧客サマリの幅を調整" />
          <SummaryPane />
          <ResizeDivider label="顧客サマリとAIチャットの幅を調整" />
          <ChatPane />
          <ResizeDivider label="AIチャットとネクストアクションの幅を調整" />
          <ActionPane />
        </div>
      </div>
    </main>
  );
}

function GlobalHeader({ theme }: { theme: CsPreviewTheme }) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border bg-brand px-3 text-brand-foreground shadow-sm">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <div className="flex size-7 items-center justify-center rounded-lg bg-brand-foreground/10 text-brand-foreground">
          <Sparkles aria-hidden className="size-4" />
        </div>
        <h1 className="truncate text-sm font-semibold">CSアシスタント</h1>
        <Badge variant="secondary" size="xs">
          Theme preview
        </Badge>
      </div>

      <nav
        aria-label="テーマを選択"
        className="flex items-center gap-1 rounded-lg bg-brand-foreground/10 p-1"
      >
        {(
          Object.entries(previewThemes) as [
            CsPreviewTheme,
            (typeof previewThemes)[CsPreviewTheme],
          ][]
        ).map(([value, item]) => (
          <Link
            key={value}
            href={`/cs/theme-preview?theme=${value}`}
            className={buttonVariants({
              variant: theme === value ? "secondary" : "ghost",
              size: "xs",
            })}
            aria-current={theme === value ? "page" : undefined}
            title={item.description}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="flex flex-1 items-center justify-end gap-2">
        <Button type="button" variant="ghost" size="icon-sm" aria-label="通知">
          <Bell aria-hidden />
        </Button>
        <Button type="button" variant="ghost" size="sm">
          <Avatar className="size-6">
            <AvatarFallback>川</AvatarFallback>
          </Avatar>
          川原 良太
          <ChevronDown aria-hidden />
        </Button>
      </div>
    </header>
  );
}

function CustomerPane() {
  return (
    <section className="flex w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground">
      <PaneHeader icon={Building2} title="顧客リスト" sidebar />
      <div className="px-3 py-3">
        <InputGroup className="bg-sidebar">
          <InputGroupAddon align="inline-start">
            <Search aria-hidden />
          </InputGroupAddon>
          <InputGroupInput
            placeholder="顧客を検索"
            aria-label="顧客を検索"
            readOnly
          />
        </InputGroup>
      </div>

      <ul className="flex min-h-0 flex-1 flex-col gap-1 px-2">
        {customers.map((customer, index) => (
          <li key={customer.name}>
            <button
              type="button"
              className={cn(
                "flex w-full flex-col gap-1.5 rounded-md px-3 py-2.5 text-left transition-colors outline-none",
                index === 0
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "hover:bg-sidebar-accent/60",
              )}
            >
              <span className="truncate text-sm font-medium">
                {customer.name}
              </span>
              <Badge variant={customer.variant} size="xs">
                {customer.phase}
              </Badge>
            </button>
          </li>
        ))}
      </ul>

      <footer className="shrink-0 border-t border-sidebar-border p-3">
        <Button type="button" variant="secondary" className="w-full">
          顧客を追加
        </Button>
      </footer>
    </section>
  );
}

function SummaryPane() {
  return (
    <section className="flex w-[300px] shrink-0 flex-col bg-background">
      <PaneHeader icon={CircleUserRound} title="顧客サマリ" />
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-4">
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">株式会社ABC</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              現在のフェーズ
            </span>
            <Badge variant="phase-onboarding" size="xs">
              導入中
            </Badge>
          </div>
        </div>

        <Card size="sm">
          <CardHeader>
            <CardTitle emphasis="prominent">契約情報</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <SummaryRow
              icon={Calendar}
              label="契約開始日"
              value="2025年4月1日"
            />
            <Separator />
            <SummaryRow
              icon={UserRound}
              label="担当マネージャー"
              value="山田 太郎"
            />
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle emphasis="prominent">FT勝ち筋サマリ</CardTitle>
            <CardDescription>顧客理解の重要ポイント</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">
              初期導入時の人事連携が成功条件。背景ニーズと代替運用の許容範囲を次回商談で確認する。
            </p>
          </CardContent>
        </Card>

        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <div className="flex items-center gap-2">
            <Clock3 aria-hidden className="size-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">相談履歴</h3>
          </div>
          <ol className="flex flex-col gap-3 overflow-hidden">
            {consultations.map((consultation, index) => (
              <li key={consultation.date} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span
                    className="mt-1.5 size-2 rounded-full bg-primary"
                    aria-hidden
                  />
                  {index < consultations.length - 1 ? (
                    <span className="mt-1 w-px flex-1 bg-border" aria-hidden />
                  ) : null}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <time className="text-xs text-muted-foreground">
                    {consultation.date}
                  </time>
                  <Badge
                    variant={
                      index === 1 ? "consultation-action" : "consultation-issue"
                    }
                    size="xs"
                  >
                    {consultation.type}
                  </Badge>
                  <p className="text-sm leading-snug">{consultation.summary}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
      <footer className="shrink-0 border-t border-border p-3">
        <Button type="button" variant="outline" className="w-full">
          すべての履歴を見る
        </Button>
      </footer>
    </section>
  );
}

function ChatPane() {
  return (
    <section className="flex min-w-[420px] flex-1 flex-col bg-canvas">
      <PaneHeader icon={Bot} title="AIチャット" />
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-4">
          <div className="rounded-xl bg-opportunity/20 p-px">
            <Card size="sm">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-opportunity/10">
                    <Sparkles aria-hidden className="size-4 text-opportunity" />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <CardTitle emphasis="prominent">上司役AIとの1on1</CardTitle>
                    <CardDescription>
                      課題を整理し、次の一手まで一緒に考えます
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </div>

          <AssistantMessage>
            今日はどの顧客について話しますか？
            状況や気になっていることを教えてください。
          </AssistantMessage>
          <UserMessage>
            ABC社の人事連携が初期導入の必須要件になり、スケジュールに遅れが出そうです。
          </UserMessage>
          <AssistantMessage>
            まず「なぜ初期導入から必須なのか」を分けて考えましょう。実現したい業務と、代替案が難しい理由は確認できていますか？
          </AssistantMessage>

          <div className="flex flex-wrap gap-2 pl-10">
            <Button type="button" variant="outline" size="sm">
              別の視点を出す
            </Button>
            <Button type="button" variant="outline" size="sm">
              <Lightbulb aria-hidden />
              打ち手を考える
            </Button>
            <Button type="button" variant="outline" size="sm">
              <ListChecks aria-hidden />
              ここまでを整理
            </Button>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-3 border-t border-border bg-background p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">
              相談がまとまったら履歴に残せます
            </span>
            <Button type="button" variant="outline" size="sm">
              相談を終了
            </Button>
          </div>
          <InputGroup className="h-auto min-h-20 bg-card">
            <InputGroupTextarea
              placeholder="メッセージを入力してください..."
              aria-label="メッセージを入力"
              readOnly
            />
            <InputGroupAddon align="block-end" className="justify-end">
              <InputGroupButton
                variant="default"
                size="icon-xs"
                aria-label="送信"
              >
                <Send aria-hidden />
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
          <Button
            type="button"
            variant="secondary"
            className="h-auto justify-start gap-3 px-3 py-2.5"
          >
            <Lightbulb aria-hidden />
            <span className="flex flex-col items-start gap-0.5">
              <span>何から話せばいいか分からない</span>
              <span className="text-xs font-normal text-muted-foreground">
                AIが最初の問いかけをします
              </span>
            </span>
          </Button>
        </div>
      </div>
    </section>
  );
}

function ActionPane() {
  return (
    <section className="flex w-[300px] shrink-0 flex-col bg-background">
      <PaneHeader icon={ListChecks} title="ネクストアクション" />
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <Sparkles aria-hidden className="size-3.5 text-primary" />
        <span className="text-xs text-muted-foreground">
          AIの提案を確認して実行へ
        </span>
      </div>
      <ul className="flex min-h-0 flex-1 flex-col gap-1 p-2">
        {actions.map((action) => (
          <li
            key={action.label}
            className="flex items-start gap-2 rounded-lg border border-transparent px-2.5 py-3 hover:border-border hover:bg-muted/60"
          >
            <Checkbox
              defaultChecked={action.completed}
              aria-label={action.label}
              className="mt-0.5"
            />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <span
                className={cn(
                  "text-sm leading-snug",
                  action.completed && "text-muted-foreground line-through",
                )}
              >
                {action.label}
              </span>
              <Badge
                variant={
                  action.priority === "高" ? "priority-high" : "priority-medium"
                }
                size="xs"
              >
                {action.priority}
              </Badge>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label={`${action.label}の操作`}
            >
              <GripVertical aria-hidden />
            </Button>
          </li>
        ))}
      </ul>
      <footer className="shrink-0 border-t border-border p-3">
        <Button type="button" variant="outline" className="w-full">
          アクションを追加
        </Button>
      </footer>
    </section>
  );
}

function PaneHeader({
  icon: Icon,
  title,
  sidebar = false,
}: {
  icon: typeof Building2;
  title: string;
  sidebar?: boolean;
}) {
  return (
    <header
      className={cn(
        "flex h-12 shrink-0 items-center gap-2 border-b px-3",
        sidebar ? "border-sidebar-border" : "border-border bg-background",
      )}
    >
      <Icon
        aria-hidden
        className={cn(
          "size-4 shrink-0",
          sidebar ? "text-sidebar-foreground/70" : "text-muted-foreground",
        )}
      />
      <h2 className="truncate text-sm font-semibold">{title}</h2>
    </header>
  );
}

function ResizeDivider({ label }: { label: string }) {
  return (
    <div
      role="separator"
      aria-label={label}
      aria-orientation="vertical"
      className="group relative z-10 w-px shrink-0 cursor-col-resize bg-border"
    >
      <span className="absolute top-1/2 left-1/2 flex h-8 w-2 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-border opacity-0 transition-opacity group-hover:opacity-100">
        <span className="h-3 w-px bg-muted-foreground/50" />
      </span>
    </div>
  );
}

function SummaryRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Calendar;
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
        <span className="text-sm">{value}</span>
      </div>
    </div>
  );
}

function AssistantMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2.5">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Bot aria-hidden className="size-4 text-primary" />
      </div>
      <div className="max-w-[78%] rounded-xl rounded-tl-sm bg-card px-3.5 py-2.5 text-sm leading-relaxed ring-1 ring-border">
        {children}
      </div>
    </div>
  );
}

function UserMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-end gap-2.5">
      <div className="max-w-[78%] rounded-xl rounded-tr-sm bg-primary px-3.5 py-2.5 text-sm leading-relaxed text-primary-foreground">
        {children}
      </div>
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary">
        <CheckCircle2
          aria-hidden
          className="size-4 text-secondary-foreground"
        />
      </div>
    </div>
  );
}
