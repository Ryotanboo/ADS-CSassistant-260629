"use client";

import { useState } from "react";
import { Bell, LogOut, Settings, Sparkles } from "lucide-react";

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
  onSignOut: () => Promise<void>;
};

export function CsGlobalHeader({
  workspace,
  onSaveUserName,
  onSignOut,
}: CsGlobalHeaderProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
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

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await onSignOut();
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border bg-brand px-4 text-brand-foreground shadow-sm">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <div className="flex size-7 items-center justify-center rounded-lg bg-brand-foreground/10">
          <Sparkles aria-hidden className="size-4 shrink-0" />
        </div>
        <h1 className="truncate text-sm font-semibold">{workspace.name}</h1>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Button
          type="button"
          variant="ghost-inverse"
          size="icon-sm"
          aria-label="通知"
        >
          <Bell aria-hidden />
        </Button>

        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DialogTrigger
            render={
              <Button type="button" variant="ghost-inverse" size="sm" />
            }
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
                  チャットや相談で使うあなたの表示名です。顧客の「社内の担当CS」とは別です。
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
            <div className="border-t border-border pt-4">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={isSigningOut}
                onClick={handleSignOut}
              >
                <LogOut aria-hidden />
                {isSigningOut ? "ログアウト中" : "ログアウト"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </header>
  );
}
