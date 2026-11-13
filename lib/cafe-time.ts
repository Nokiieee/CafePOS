// Dates and times on the cafe's own clock.
//
// The server doesn't run in the cafe's time zone (Vercel uses UTC, 8 hours
// behind Manila), and the database stores exact moments in UTC. So "today"
// and "2:05 PM" are always worked out for this time zone, never the server's.
export const CAFE_TIME_ZONE = "Asia/Manila";

// A day is written as "2026-11-13" everywhere in the app, including the URL.
const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Today's date at the cafe, like "2026-11-13". */
export function cafeToday(): string {
  // The "en-CA" (Canada) format happens to be year-month-day.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: CAFE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** True for a real date like "2026-11-13" (not "2026-02-31" or "hello"). */
export function isCafeDay(value: unknown): value is string {
  if (typeof value !== "string" || !DAY_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  // An impossible date rolls over (Feb 31 → Mar 3), so it won't match itself.
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

/** The day before or after: shiftCafeDay("2026-11-13", -1) is "2026-11-12". */
export function shiftCafeDay(day: string, days: number): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * The exact moments a cafe day starts and the next one starts, for a
 * database filter: created_at >= start and created_at < end.
 */
export function cafeDayRange(day: string): { start: string; end: string } {
  return {
    start: startOfCafeDay(day).toISOString(),
    end: startOfCafeDay(shiftCafeDay(day, 1)).toISOString(),
  };
}

/** A moment as the cafe's clock time: "2:05 PM". */
export function formatCafeTime(moment: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: CAFE_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(moment));
}

/** A day in words: "Friday, November 13, 2026". */
export function formatCafeDay(day: string): string {
  // Noon UTC on that date, shown in UTC, can't slip into the day before or after.
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${day}T12:00:00Z`));
}

// Midnight at the cafe on that day, as an exact moment.
function startOfCafeDay(day: string): Date {
  const utcMidnight = new Date(`${day}T00:00:00Z`);
  // Manila is 8 hours ahead of UTC, so its midnight is 8 hours earlier in UTC.
  return new Date(utcMidnight.getTime() - cafeOffsetMinutes(utcMidnight) * 60_000);
}

// How far the cafe's clock is ahead of UTC, in minutes (+480 for Manila).
// Read from the browser/server's time zone data rather than written as 480,
// so changing CAFE_TIME_ZONE is all it takes to move the cafe.
function cafeOffsetMinutes(moment: Date): number {
  const name =
    new Intl.DateTimeFormat("en-US", { timeZone: CAFE_TIME_ZONE, timeZoneName: "longOffset" })
      .formatToParts(moment)
      .find((part) => part.type === "timeZoneName")?.value ?? "GMT";

  // "GMT+08:00", "GMT-05:30", or just "GMT" for UTC itself.
  const match = /GMT([+-])(\d{2}):(\d{2})/.exec(name);
  if (!match) return 0;
  const minutes = Number(match[2]) * 60 + Number(match[3]);
  return match[1] === "+" ? minutes : -minutes;
}
