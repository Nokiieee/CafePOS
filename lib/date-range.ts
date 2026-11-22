import { formatCafeDayShort, isCafeDay, shiftCafeDay } from "@/lib/cafe-time";

// Picking dates on the Orders and Summary pages: the one day the page shows,
// or a range of days. Plain rules shared by the pages (server) and their
// toolbars and popups (browser).
//
// In the address, only what differs from the default:
//   (nothing)                                  today
//   ?date=2026-11-15                           one past day
//   ?range=30d                                 the last 30 days
//   ?range=custom&from=2026-11-01&to=2026-11-15

// "day" is the one day the page shows (?date=, or today): the default, where
// the day picker stays. The others cover a range of days, counted back from
// today (or picked, for Custom).
export type DateRange = "day" | "7d" | "30d" | "month" | "custom";

/** The Dates choices. The "day" label is a stand-in: see dayLabel(). */
export const DATE_RANGES: { value: DateRange; label: string }[] = [
  { value: "day", label: "Today" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "month", label: "This month" },
  { value: "custom", label: "Custom" },
];

/** The dates picked: a range, plus its first and last day for Custom. */
export type DateChoice = {
  range: DateRange;
  /** Only for a custom range: the first and last day, like "2026-11-01". */
  from: string | null;
  to: string | null;
};

export const DEFAULT_DATES: DateChoice = { range: "day", from: null, to: null };

export type SearchParams = Record<string, string | string[] | undefined>;

/** One value from the address; a repeated key (a list) counts as missing. */
export function param(params: SearchParams, key: string): string | undefined {
  const value = params[key];
  return typeof value === "string" ? value : undefined;
}

/** Reads the dates from the address. Anything unknown or broken gives the one day. */
export function parseDates(params: SearchParams, today: string): DateChoice {
  const range = DATE_RANGES.find((option) => option.value === param(params, "range"))?.value;

  if (range === "custom") {
    const from = param(params, "from");
    const to = param(params, "to");
    // Both real days, in order, and not in the future.
    if (isCafeDay(from) && isCafeDay(to) && from <= to && to <= today) {
      return { range, from, to };
    }
    return DEFAULT_DATES;
  }

  return range ? { range, from: null, to: null } : DEFAULT_DATES;
}

/**
 * The first and last day the dates cover, both included. "day" is the day
 * the page shows; the ranges count back from today.
 */
export function filterDays(
  dates: DateChoice,
  today: string,
  day: string = today,
): { from: string; to: string } {
  switch (dates.range) {
    case "7d":
      return { from: shiftCafeDay(today, -6), to: today };
    case "30d":
      return { from: shiftCafeDay(today, -29), to: today };
    case "month":
      // "2026-11-18" → "2026-11-01".
      return { from: `${today.slice(0, 8)}01`, to: today };
    case "custom":
      if (dates.from && dates.to) return { from: dates.from, to: dates.to };
      break;
  }
  return { from: day, to: day };
}

/** How many days from one day to another, both included: Nov 1 to Nov 3 is 3. */
export function dayCount(from: string, to: string): number {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  const start = new Date(`${from}T00:00:00Z`).getTime();
  const end = new Date(`${to}T00:00:00Z`).getTime();
  return Math.round((end - start) / millisecondsPerDay) + 1;
}

/** The "day" choice in words: "Today", or the date the day picker is on, like "Nov 15". */
export function dayLabel(day: string, today: string): string {
  return day === today ? "Today" : formatCafeDayShort(day);
}

/** A range in words: "Last 7 days", "Last 30 days", "This month", "Custom dates". */
export function rangeLabel(dates: DateChoice): string {
  switch (dates.range) {
    case "30d":
      return "Last 30 days";
    case "month":
      return "This month";
    case "custom":
      return "Custom dates";
    default:
      return "Last 7 days";
  }
}

/**
 * Writes the dates into an address's search part: ?date= for a past day
 * (nothing for today, the same clean address as the day picker's), or
 * ?range=, plus ?from= and ?to= for Custom.
 */
export function writeDates(
  params: URLSearchParams,
  dates: DateChoice,
  day: string,
  today: string,
): void {
  if (dates.range === "day") {
    if (day !== today) params.set("date", day);
    return;
  }
  params.set("range", dates.range);
  if (dates.range === "custom" && dates.from && dates.to) {
    params.set("from", dates.from);
    params.set("to", dates.to);
  }
}
