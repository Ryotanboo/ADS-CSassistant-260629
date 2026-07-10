"use client";

import { useState } from "react";
import { Bell, Settings, Sparkles } from "lucide-react";

import { type CsWorkspace } from "@/lib/cs-schema";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type CsGlobalHeaderProps = {
  workspace: CsWorkspace;
  onSaveUserName: (name: string) => Promise<void>;
};

export function CsGlobalHeader({
  workspace,
  onSaveUserName,
}: CsGlobalHeaderProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const userInitial = workspace.currentUser.name[0] ?? "?";

  const handleSubmit = async (formData: FormData) => {
    const name = String(formData.get("userName") ?? "").trim();
    if (!name) return;
    setIsSaving(true);
    try {
      await onSaveUserName(name);
      setSettingsOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

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

        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DialogTrigger
            render={<Button type="button" variant="ghost" size="sm" />}
          >
            <Avatar className="size-7">
              <AvatarFallback>{userInitial}</AvatarFallback>
            </Avatar>
            <span className="hidden sm:inline">{workspace.currentUser.name}</span>
            <Settings aria-hidden />
          </DialogTrigger>
          <DialogContent>
            <form action={handleSubmit} className="flex flex-col gap-5">
              <DialogHeader>
                <DialogTitle>ユーザー設定</DialogTitle>
                <DialogDescription>
                  CSアシスタントに表示する名前を設定します。
                </DialogDescription>
              </DialogHeader>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="cs-user-name">表示名</FieldLabel>
                  <Input
                    key={workspace.currentUser.name}
                    id="cs-user-name"
                    name="userName"
                    defaultValue={workspace.currentUser.name}
                    maxLength={80}
                    required
                    autoFocus
                  />
                </Field>
              </FieldGroup>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSettingsOpen(false)}
                >
                  キャンセル
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? "保存中" : "保存"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </header>
  );
}
