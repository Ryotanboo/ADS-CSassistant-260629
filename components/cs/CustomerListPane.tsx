"use client";

import { useMemo, useState } from "react";
import { Archive, Building2, MoreHorizontal, Plus, Search, Trash2 } from "lucide-react";

import { type Customer, type CustomerPhase } from "@/lib/cs-schema";
import {
  CUSTOMER_PHASE_LABELS,
  CUSTOMER_PHASE_LIST_RANK,
  CUSTOMER_PHASE_ORDER,
} from "@/lib/cs-labels";
import { phaseBadgeVariant } from "@/lib/cs-badges";
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
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type AddCustomerInput = {
  name: string;
  phase: CustomerPhase;
  accountManager: string;
};

type CustomerListPaneProps = {
  customers: Customer[];
  selectedCustomerId: string;
  onSelectCustomer: (id: string) => void;
  onAddCustomer: (customer: AddCustomerInput) => void;
  onArchiveCustomer: (id: string, archived: boolean) => void;
  onDeleteCustomer: (id: string) => void;
};

function sortCustomersForList(customers: Customer[]) {
  return [...customers].sort((a, b) => {
    const phaseDiff =
      CUSTOMER_PHASE_LIST_RANK[a.phase] - CUSTOMER_PHASE_LIST_RANK[b.phase];
    if (phaseDiff !== 0) return phaseDiff;
    return a.name.localeCompare(b.name, "ja");
  });
}

export function CustomerListPane({
  customers,
  selectedCustomerId,
  onSelectCustomer,
  onAddCustomer,
  onArchiveCustomer,
  onDeleteCustomer,
}: CustomerListPaneProps) {
  const [query, setQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);

  const archivedCount = useMemo(
    () => customers.filter((customer) => customer.archived).length,
    [customers],
  );

  const visibleCustomers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const filtered = customers.filter((customer) => {
      const matchesArchive = showArchived
        ? customer.archived
        : !customer.archived;
      if (!matchesArchive) return false;
      if (!normalized) return true;
      return customer.name.toLowerCase().includes(normalized);
    });
    return sortCustomersForList(filtered);
  }, [customers, query, showArchived]);

  return (
    <section className="flex h-full min-h-0 w-full flex-col bg-sidebar text-sidebar-foreground">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-sidebar-border px-3">
        <Building2
          aria-hidden
          className="size-4 shrink-0 text-sidebar-foreground/70"
        />
        <h2 className="truncate text-sm font-semibold">顧客リスト</h2>
      </header>

      <div className="flex shrink-0 flex-col gap-2 px-3 py-3">
        <InputGroup>
          <InputGroupAddon align="inline-start">
            <Search aria-hidden />
          </InputGroupAddon>
          <InputGroupInput
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="顧客を検索"
            aria-label="顧客を検索"
          />
        </InputGroup>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">
            {showArchived
              ? `アーカイブ ${visibleCustomers.length}件`
              : `対応中 ${visibleCustomers.length}件`}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={() => setShowArchived((prev) => !prev)}
            disabled={!showArchived && archivedCount === 0}
          >
            <Archive aria-hidden />
            {showArchived ? "対応中を表示" : "アーカイブ"}
          </Button>
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        {visibleCustomers.length === 0 ? (
          <p className="px-3 py-6 text-center text-xs text-muted-foreground">
            {showArchived
              ? "アーカイブされた顧客はありません"
              : query.trim()
                ? "該当する顧客がありません"
                : "顧客がありません。追加してください"}
          </p>
        ) : (
          <ul className="flex flex-col gap-1 px-2 pb-3">
            {visibleCustomers.map((customer) => {
              const selected = customer.id === selectedCustomerId;
              return (
                <li key={customer.id} className="group/customer relative">
                  <button
                    type="button"
                    onClick={() => onSelectCustomer(customer.id)}
                    className={cn(
                      "flex w-full flex-col gap-1.5 rounded-md px-2.5 py-2.5 pr-9 text-left transition-colors",
                      "outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                      selected
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "hover:bg-sidebar-accent/60",
                      customer.archived && "opacity-70",
                    )}
                  >
                    <span className="truncate text-sm">{customer.name}</span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge
                        variant={phaseBadgeVariant(customer.phase)}
                        size="xs"
                      >
                        {CUSTOMER_PHASE_LABELS[customer.phase]}
                      </Badge>
                      {customer.archived ? (
                        <Badge variant="secondary" size="xs">
                          アーカイブ
                        </Badge>
                      ) : null}
                    </div>
                  </button>

                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          className={cn(
                            "absolute top-2 right-1.5 text-muted-foreground opacity-0 transition-opacity",
                            "group-hover/customer:opacity-100 group-focus-within/customer:opacity-100",
                          )}
                          aria-label={`${customer.name} の操作`}
                        />
                      }
                    >
                      <MoreHorizontal aria-hidden />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="right" align="start">
                      <DropdownMenuGroup>
                        <DropdownMenuItem
                          onClick={() =>
                            onArchiveCustomer(customer.id, !customer.archived)
                          }
                        >
                          <Archive aria-hidden />
                          {customer.archived
                            ? "アーカイブ解除"
                            : "アーカイブ"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => setDeleteTarget(customer)}
                        >
                          <Trash2 aria-hidden />
                          削除
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </li>
              );
            })}
          </ul>
        )}
      </ScrollArea>

      <footer className="shrink-0 border-t border-sidebar-border p-3">
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => setAddOpen(true)}
        >
          <Plus aria-hidden />
          顧客追加
        </Button>
      </footer>

      <CustomerAddDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onAdd={onAddCustomer}
      />

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>顧客を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              「{deleteTarget?.name}
              」を完全に削除します。相談履歴・チャット・ネクストアクションも一緒に削除され、元に戻せません。誤作成の整理向けです。対応終了ならアーカイブを推奨します。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (!deleteTarget) return;
                onDeleteCustomer(deleteTarget.id);
                setDeleteTarget(null);
              }}
            >
              削除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function CustomerAddDialog({
  open,
  onOpenChange,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (customer: AddCustomerInput) => void;
}) {
  const [name, setName] = useState("");
  const [phase, setPhase] = useState<CustomerPhase | "">("");
  const [accountManager, setAccountManager] = useState("");

  const reset = () => {
    setName("");
    setPhase("");
    setAccountManager("");
  };

  const handleAdd = () => {
    const trimmedName = name.trim();
    const trimmedManager = accountManager.trim();
    if (!trimmedName || !phase || !trimmedManager) return;

    onAdd({
      name: trimmedName,
      phase,
      accountManager: trimmedManager,
    });
    reset();
    onOpenChange(false);
  };

  const canAdd = Boolean(name.trim() && phase && accountManager.trim());

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) reset();
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>顧客を追加</DialogTitle>
          <DialogDescription>
            担当顧客リストに新しい顧客を追加します
          </DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="customer-name">会社名</FieldLabel>
            <Input
              id="customer-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.preventDefault();
              }}
              placeholder="例: 株式会社ABC"
            />
          </Field>

          <Field>
            <FieldLabel>フェーズ</FieldLabel>
            <Select
              value={phase || undefined}
              onValueChange={(value) => setPhase(value as CustomerPhase)}
            >
              <SelectTrigger className="w-full" aria-label="フェーズを選択">
                <SelectValue placeholder="フェーズを選択" />
              </SelectTrigger>
              <SelectContent align="start">
                {CUSTOMER_PHASE_ORDER.map((phaseValue) => (
                  <SelectItem key={phaseValue} value={phaseValue}>
                    {CUSTOMER_PHASE_LABELS[phaseValue]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel htmlFor="customer-account-manager">担当者</FieldLabel>
            <Input
              id="customer-account-manager"
              value={accountManager}
              onChange={(e) => setAccountManager(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.preventDefault();
              }}
              placeholder="例: 山田 太郎"
            />
          </Field>
        </FieldGroup>

        <DialogFooter>
          <DialogClose render={<Button variant="outline">キャンセル</Button>} />
          <Button onClick={handleAdd} disabled={!canAdd}>
            追加
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
