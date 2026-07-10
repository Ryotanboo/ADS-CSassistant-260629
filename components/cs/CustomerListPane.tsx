"use client";

import { useMemo, useState } from "react";
import { Building2, Plus, Search } from "lucide-react";

import { type Customer, type CustomerPhase } from "@/lib/cs-schema";
import { CUSTOMER_PHASE_LABELS, CUSTOMER_PHASE_ORDER } from "@/lib/cs-labels";
import { phaseBadgeVariant } from "@/lib/cs-badges";
import { cn } from "@/lib/utils";
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
};

export function CustomerListPane({
  customers,
  selectedCustomerId,
  onSelectCustomer,
  onAddCustomer,
}: CustomerListPaneProps) {
  const [query, setQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  const filteredCustomers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return customers;
    return customers.filter((c) => c.name.toLowerCase().includes(normalized));
  }, [customers, query]);

  return (
    <section className="flex w-[260px] shrink-0 flex-col border-r border-border bg-background">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-3">
        <Building2
          aria-hidden
          className="size-4 shrink-0 text-muted-foreground"
        />
        <h2 className="truncate text-sm font-semibold text-foreground">
          顧客リスト
        </h2>
      </header>

      <div className="shrink-0 px-3 py-3">
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
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <ul className="flex flex-col gap-1 px-2 pb-3">
          {filteredCustomers.map((customer) => {
            const selected = customer.id === selectedCustomerId;
            return (
              <li key={customer.id}>
                <button
                  type="button"
                  onClick={() => onSelectCustomer(customer.id)}
                  className={cn(
                    "flex w-full flex-col gap-1.5 rounded-md px-2.5 py-2.5 text-left transition-colors",
                    "outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                    selected
                      ? "bg-accent text-accent-foreground"
                      : "text-foreground hover:bg-muted",
                  )}
                >
                  <span className="truncate text-sm">{customer.name}</span>
                  <Badge variant={phaseBadgeVariant(customer.phase)} size="xs">
                    {CUSTOMER_PHASE_LABELS[customer.phase]}
                  </Badge>
                </button>
              </li>
            );
          })}
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
          顧客追加
        </Button>
      </footer>

      <CustomerAddDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onAdd={onAddCustomer}
      />
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
