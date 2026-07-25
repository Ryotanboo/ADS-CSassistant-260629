import { type Customer } from "@/lib/cs-schema";
import { CUSTOMER_PHASE_LIST_RANK } from "@/lib/cs-labels";

/** 顧客リスト（対応中 / アーカイブ）と同じ並び。 */
export function sortCustomersForList(customers: Customer[]): Customer[] {
  return [...customers].sort((a, b) => {
    const phaseDiff =
      CUSTOMER_PHASE_LIST_RANK[a.phase] - CUSTOMER_PHASE_LIST_RANK[b.phase];
    if (phaseDiff !== 0) return phaseDiff;
    return a.name.localeCompare(b.name, "ja");
  });
}

/**
 * 初期選択・アーカイブ後のフォールバック用。
 * 対応中があればその先頭、なければアーカイブ側の先頭。
 */
export function pickDefaultCustomerId(customers: Customer[]): string {
  const active = sortCustomersForList(
    customers.filter((customer) => !customer.archived),
  );
  if (active[0]) return active[0].id;

  const archived = sortCustomersForList(
    customers.filter((customer) => customer.archived),
  );
  return archived[0]?.id ?? "";
}
