"use client";

import { useState } from "react";
import { ListChecks, MoreHorizontal, Plus, Sparkles } from "lucide-react";

import { type NextAction } from "@/lib/cs-schema";
import { NEXT_ACTION_PRIORITY_LABELS } from "@/lib/cs-labels";
import { priorityBadgeVariant } from "@/lib/cs-badges";
import { cn } from "@/lib/utils";
import { AddItemDialog } from "@/components/workspace/AddItemDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";

type NextActionPaneProps = {
  actions: NextAction[];
  onToggleAction: (id: string, completed: boolean) => void;
  onAddAction: (label: string) => void;
  onDeleteAction: (id: string) => void;
};

export function NextActionPane({
  actions,
  onToggleAction,
  onAddAction,
  onDeleteAction,
}: NextActionPaneProps) {
  const [addOpen, setAddOpen] = useState(false);

  return (
    <section className="flex w-[280px] shrink-0 flex-col bg-background">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-3">
        <ListChecks aria-hidden className="size-4 shrink-0 text-muted-foreground" />
        <h2 className="truncate text-sm font-semibold text-foreground">
          ネクストアクション
        </h2>
      </header>

      <div className="flex shrink-0 items-center gap-1.5 border-b border-border px-3 py-2">
        <Sparkles aria-hidden className="size-3.5 text-primary" />
        <span className="text-xs text-muted-foreground">AIが提案</span>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <ul className="flex flex-col gap-1 p-2">
          {actions.map((action) => (
            <li
              key={action.id}
              className="group/action flex items-start gap-2 rounded-md px-2 py-2 hover:bg-muted"
            >
              <Checkbox
                checked={action.completed}
                onCheckedChange={(checked) =>
                  onToggleAction(action.id, checked === true)
                }
                aria-label={action.label}
                className="mt-0.5"
              />
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <span
                  className={cn(
                    "text-sm text-foreground",
                    action.completed && "text-muted-foreground line-through",
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
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      className={cn(
                        "shrink-0 text-muted-foreground opacity-0 transition-opacity",
                        "group-hover/action:opacity-100 group-focus-within/action:opacity-100",
                      )}
                      aria-label={`${action.label} の操作`}
                    >
                      <MoreHorizontal aria-hidden />
                    </Button>
                  }
                />
                <DropdownMenuContent side="left" align="start">
                  <DropdownMenuGroup>
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={() => onDeleteAction(action.id)}
                    >
                      削除
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
          ))}
        </ul>
      </ScrollArea>

      <footer className="shrink-0 border-t border-border p-3">
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => setAddOpen(true)}
        >
          <Plus aria-hidden />
          アクションを追加
        </Button>
      </footer>

      <AddItemDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        title="アクションを追加"
        description="ネクストアクションに新しいタスクを追加します"
        fieldLabel="アクション"
        fieldId="next-action-label"
        placeholder="例: 担当者と次回MTGを設定"
        onAdd={onAddAction}
      />
    </section>
  );
}
