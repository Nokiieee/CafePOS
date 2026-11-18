import type { OrderType } from "@/components/pos/bill";
import { formatCafeDayShort, isCafeDay, shiftCafeDay } from "@/lib/cafe-time";

// Searching past orders from the Orders page: the search text and the
// filters, read from and written to the address. Plain rules shared by the
// page (server) and the toolbar (browser).
//
// The address holds only what differs from the defaults:
//   ?date=2026-11-15&voided=only          (one day, filtered)
//   ?q=latte&range=30d&cashier=Ana&type=take-out
//   ?range=custom&from=2026-11-01&to=2026-11-15

/** How many days a new search covers ("7 days"), today included. */
export const SEARCH_DAYS = 7;

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

// "day" is the one day the page shows (?date=, or today): the default, where
// the day picker stays and the other filters work on that day. The others
// show results across a range of days.
export type DateRange = "day" | "7d" | "30d" | "month" | "custom";
export type OrderTypeFilter = "all" | OrderType;
export type VoidedFilter = "all" | "none" | "only";

/** The Dates choices. The "day" label is a stand-in: see dayLabel(). */
export const DATE_RANGES: { value: DateRange; label: string }[] = [
  { value: "day", label: "Today" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "month", label: "This month" },
  { value: "custom", label: "Custom" },
];

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

export type OrderFilters = {
  range: DateRange;
  /** Only for a custom range: the first and last day, like "2026-11-01". */
  from: string | null;
  to: string | null;
  /** A cashier's name, or null for everyone. */
  cashier: string | null;
  orderType: OrderTypeFilter;
  voided: VoidedFilter;
};

export const DEFAULT_FILTERS: OrderFilters = {
  range: "day",
  from: null,
  to: null,
  cashier: null,
  orderType: "all",
  voided: "all",
};

type SearchParams = Record<string, string | string[] | undefined>;

// One value from the address; a repeated key (a list) counts as missing.
function param(params: SearchParams, key: string): string | undefined {
  const value = params[key];
  return typeof value === "string" ? value : undefined;
}

/** Reads the filters from the address. Anything unknown or broken falls back to its default. */
export function parseOrderFilters(params: SearchParams, today: string): OrderFilters {
  const cashier = param(params, "cashier")?.trim().slice(0, MAX_QUERY_LENGTH) || null;
  const orderType =
    ORDER_TYPE_FILTERS.find((option) => option.value === param(params, "type"))?.value ?? "all";
  const voided =
    VOIDED_FILTERS.find((option) => option.value === param(params, "voided"))?.value ?? "all";
  const range = DATE_RANGES.find((option) => option.value === param(params, "range"))?.value ?? "day";

  const filters: OrderFilters = { ...DEFAULT_FILTERS, cashier, orderType, voided, range };

  if (range === "custom") {
    const from = param(params, "from");
    const to = param(params, "to");
    // Both real days, in order, and not in the future; otherwise the default.
    if (isCafeDay(from) && isCafeDay(to) && from <= to && to <= today) {
      return { ...filters, from, to };
    }
    return { ...filters, range: "day" };
  }

  return filters;
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
 * The first and last day a search covers, both included. "day" is the day
 * the page shows; the ranges count back from today.
 */
export function filterDays(
  filters: OrderFilters,
  today: string,
  day: string = today,
): { from: string; to: string } {
  switch (filters.range) {
    case "day":
      return { from: day, to: day };
    case "30d":
      return { from: shiftCafeDay(today, -29), to: today };
    case "month":
      // "2026-11-18" → "2026-11-01".
      return { from: `${today.slice(0, 8)}01`, to: today };
    case "custom":
      if (filters.from && filters.to) return { from: filters.from, to: filters.to };
      break;
  }
  return { from: shiftCafeDay(today, -(SEARCH_DAYS - 1)), to: today };
}

/** The "day" choice in words: "Today", or the date the day picker is on, like "Nov 15". */
export function dayLabel(day: string, today: string): string {
  return day === today ? "Today" : formatCafeDayShort(day);
}

/** The range in words: "Last 7 days", "Last 30 days", "This month", "Custom dates". */
export function rangeLabel(filters: OrderFilters): string {
  switch (filters.range) {
    case "30d":
      return "Last 30 days";
    case "month":
      return "This month";
    case "custom":
      return "Custom dates";
    default:
      return `Last ${SEARCH_DAYS} days`;
  }
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
  if (filters.range === "day") {
    // Today has a clean address, the same as the day picker's.
    if (day !== today) params.set("date", day);
  } else {
    params.set("range", filters.range);
    if (filters.range === "custom" && filters.from && filters.to) {
      params.set("from", filters.from);
      params.set("to", filters.to);
    }
  }
  if (filters.cashier) params.set("cashier", filters.cashier);
  if (filters.orderType !== "all") params.set("type", filters.orderType);
  if (filters.voided !== "all") params.set("voided", filters.voided);

  const query = params.toString();
  return query ? `/dashboard/orders?${query}` : "/dashboard/orders";
}
