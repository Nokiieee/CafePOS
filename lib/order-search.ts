import type { OrderType } from "@/components/pos/bill";
import {
  DEFAULT_DATES,
  param,
  parseDates,
  writeDates,
  type DateChoice,
  type SearchParams,
} from "@/lib/date-range";

// Searching past orders from the Orders page: the search text and the
// filters, read from and written to the address. Plain rules shared by the
// page (server) and the toolbar (browser).
//
// The address holds only what differs from the defaults:
//   ?date=2026-11-15&voided=only          (one day, filtered)
//   ?q=latte&range=30d&cashier=Ana&type=take-out
//   ?range=custom&from=2026-11-01&to=2026-11-15
// The dates part (date, range, from, to) follows lib/date-range.ts, which
// the Summary page shares.

/** The most results shown at once. More than this asks for a narrower search. */
export const MAX_SEARCH_RESULTS = 200;

/** The longest search text or cashier name kept. */
export const MAX_QUERY_LENGTH = 100;

/** What was typed: part of an item's name, or an order total in cents. */
export type SearchQuery = { kind: "item"; text: string } | { kind: "amount"; cents: number };

// "12", "12.5", "12.75", "$12.75" (commas are dropped first, so "1,250" works too).
const AMOUNT = /^\$?\s*(\d{1,7})(?:\.(\d{1,2}))?$/;

/** Reads the ?q= value. Nothing usable (missing, blank, a list) gives null: no search text. */
export function parseSearchQuery(value: unknown): SearchQuery | null {
  if (typeof value !== "string") return null;
  const text = value.trim().slice(0, MAX_QUERY_LENGTH);
  if (!text) return null;

  // Something that reads as money searches order totals. No item name is
  // only a number, so nothing is lost.
  const amount = AMOUNT.exec(text.replace(/,/g, ""));
  if (amount) {
    // "12.5" is 12 dollars and 50 cents: the cents are padded to two digits.
    const cents = Number(amount[1]) * 100 + Number((amount[2] ?? "").padEnd(2, "0"));
    return { kind: "amount", cents };
  }

  return { kind: "item", text };
}

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

export type OrderTypeFilter = "all" | OrderType;
export type VoidedFilter = "all" | "none" | "only";

export const ORDER_TYPE_FILTERS: { value: OrderTypeFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "dine-in", label: "Dine In" },
  { value: "take-out", label: "Take Out" },
];

export const VOIDED_FILTERS: { value: VoidedFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "none", label: "Not voided" },
  { value: "only", label: "Voided only" },
];

/** The Dates choice (lib/date-range.ts), plus who, what kind and voids. */
export type OrderFilters = DateChoice & {
  /** A cashier's name, or null for everyone. */
  cashier: string | null;
  orderType: OrderTypeFilter;
  voided: VoidedFilter;
};

export const DEFAULT_FILTERS: OrderFilters = {
  ...DEFAULT_DATES,
  cashier: null,
  orderType: "all",
  voided: "all",
};

/** Reads the filters from the address. Anything unknown or broken falls back to its default. */
export function parseOrderFilters(params: SearchParams, today: string): OrderFilters {
  const cashier = param(params, "cashier")?.trim().slice(0, MAX_QUERY_LENGTH) || null;
  const orderType =
    ORDER_TYPE_FILTERS.find((option) => option.value === param(params, "type"))?.value ?? "all";
  const voided =
    VOIDED_FILTERS.find((option) => option.value === param(params, "voided"))?.value ?? "all";

  return { ...parseDates(params, today), cashier, orderType, voided };
}

/** How many filters differ from the defaults, for "Filters · 2". */
export function activeFilterCount(filters: OrderFilters): number {
  return [
    filters.range !== "day",
    filters.cashier !== null,
    filters.orderType !== "all",
    filters.voided !== "all",
  ].filter(Boolean).length;
}

/**
 * The Orders page address for this search; the bare address for today with
 * nothing to search. day: the day shown when the range is "day".
 */
export function ordersSearchUrl(
  text: string,
  filters: OrderFilters,
  day: string,
  today: string,
): string {
  const params = new URLSearchParams();
  const trimmed = text.trim();
  if (trimmed) params.set("q", trimmed);
  writeDates(params, filters, day, today);
  if (filters.cashier) params.set("cashier", filters.cashier);
  if (filters.orderType !== "all") params.set("type", filters.orderType);
  if (filters.voided !== "all") params.set("voided", filters.voided);

  const query = params.toString();
  return query ? `/dashboard/orders?${query}` : "/dashboard/orders";
}
