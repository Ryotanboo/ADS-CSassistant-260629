"use client";

import { useMemo, useState } from "react";
import { Building2, Plus, Search } from "lucide-react";

import { type Customer } from "@/lib/cs-schema";
import { CUSTOMER_PHASE_LABELS } from "@/lib/cs-labels";
import { phaseBadgeVariant } from "@/lib/cs-badges";
import { cn } from "@/lib/utils";
import { AddItemDialog } from "@/components/workspace/AddItemDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { ScrollArea } from "@/components/ui/scroll-area";

type CustomerListPaneProps = {
  customers: Customer[];
  selectedCustomerId: string;
  onSelectCustomer: (id: string) => void;
  onAddCustomer: (name: string) => void;
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
        <Building2 aria-hidden className="size-4 shrink-0 text-muted-foreground" />
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
                  <Badge
                    variant={phaseBadgeVariant(customer.phase)}
                    size="xs"
                  >
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

      <AddItemDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        title="顧客を追加"
        description="担当顧客リストに新しい顧客を追加します"
        fieldLabel="会社名"
        fieldId="customer-name"
        placeholder="例: 株式会社ABC"
        onAdd={onAddCustomer}
      />
    </section>
  );
}
