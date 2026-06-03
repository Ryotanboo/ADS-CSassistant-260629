import { Bell, Sparkles } from "lucide-react";

import { type CsWorkspace } from "@/lib/cs-schema";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

type CsGlobalHeaderProps = {
  workspace: CsWorkspace;
};

export function CsGlobalHeader({ workspace }: CsGlobalHeaderProps) {
  const userInitial = workspace.currentUser.name[0] ?? "?";

  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border bg-background px-4">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <Sparkles aria-hidden className="size-4 shrink-0 text-primary" />
        <h1 className="truncate text-sm font-semibold text-foreground">
          {workspace.name}
        </h1>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground"
          aria-label="通知"
        >
          <Bell aria-hidden />
        </Button>

        <div className="flex items-center gap-2 rounded-md px-1 py-1">
          <Avatar className="size-7">
            <AvatarFallback className="bg-primary/10 text-xs text-primary">
              {userInitial}
            </AvatarFallback>
          </Avatar>
          <span className="hidden text-sm text-foreground sm:inline">
            {workspace.currentUser.name}
          </span>
        </div>
      </div>
    </header>
  );
}
