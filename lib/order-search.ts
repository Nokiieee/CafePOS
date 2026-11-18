import { shiftCafeDay } from "@/lib/cafe-time";

// Searching past orders from the Orders page. Plain rules shared by the page
// (server) and the search box (browser).

/** How many days a search looks at, today included. */
export const SEARCH_DAYS = 7;

/** The most results shown at once. More than this asks for a narrower search. */
export const MAX_SEARCH_RESULTS = 200;

/** The longest search text kept. */
export const MAX_QUERY_LENGTH = 100;

/** What was typed: part of an item's name, or an order total in cents. */
export type SearchQuery = { kind: "item"; text: string } | { kind: "amount"; cents: number };

// "12", "12.5", "12.75", "$12.75" (commas are dropped first, so "1,250" works too).
const AMOUNT = /^\$?\s*(\d{1,7})(?:\.(\d{1,2}))?$/;

/** Reads the ?q= value. Nothing usable (missing, blank, a list) gives null: no search. */
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

/** The days a search covers: the last SEARCH_DAYS days, today included. */
export function searchDays(today: string): { from: string; to: string } {
  return { from: shiftCafeDay(today, -(SEARCH_DAYS - 1)), to: today };
}
