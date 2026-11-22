import type { Metadata } from "next";
import { Suspense } from "react";
import { DayPicker } from "@/components/orders/day-picker";
import { SignedInAs, SignedInAsFallback } from "@/components/pos/signed-in-as";
import { SummaryEmpty, SummarySkeleton, SummaryView } from "@/components/summary/summary-view";
import { requireAdmin } from "@/lib/auth";
import {
  cafeDayFromParam,
  cafeToday,
  formatCafeDay,
  formatCafeDayShort,
  formatCafeTime,
} from "@/lib/cafe-time";
import { dayCount, filterDays, parseDates, rangeLabel } from "@/lib/date-range";
import { getOrdersBetween } from "@/lib/orders";
import { MAX_SUMMARY_DAYS, summarizeOrders } from "@/lib/summary";

export const metadata: Metadata = {
  title: "Summary · Cafe POS",
};

// The summary for one day, or a range of days, for admins only. The dates
// come from the address, like on Orders (lib/date-range.ts): ?date=2026-11-17
// for one day (today when there isn't one), or ?range=7d, ?range=30d,
// ?range=month, ?range=custom&from=...&to=... The rail around it comes from
// the Manage layout (app/dashboard/(manage)/layout.tsx).
export default function SummaryPage({ searchParams }: PageProps<"/dashboard/summary">) {
  return (
    <main className="flex min-w-0 flex-1 flex-col gap-6 overflow-y-auto px-6 pt-8 pb-8 [scrollbar-color:var(--color-latte-300)_transparent] sm:px-10">
      <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">Summary</h1>
        <div className="min-w-0 max-w-full">
          <Suspense fallback={<SignedInAsFallback />}>
            <SignedInAs />
          </Suspense>
        </div>
      </header>

      {/* Reading the URL and the session depends on the request, so this
          part streams in after the page's frame (Cache Components rule). */}
      <Suspense fallback={<SummarySkeleton />}>
        <SummaryContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

type SummaryContentProps = {
  searchParams: PageProps<"/dashboard/summary">["searchParams"];
};

async function SummaryContent({ searchParams }: SummaryContentProps) {
  // Admins only. Signed-out visitors go to the login page and cashiers go
  // back to the register, even if they type this page's address.
  await requireAdmin();

  const params = await searchParams;
  const today = cafeToday();
  const day = cafeDayFromParam(params.date, today);
  const dates = parseDates(params, today);
  // A range of days (7 days, 30 days...) instead of the one day.
  const isRange = dates.range !== "day";
  const { from, to } = filterDays(dates, today, day);
  // Only a typed Custom range can be this long. Its orders aren't loaded:
  // that could take a long time.
  const isTooLong = dayCount(from, to) > MAX_SUMMARY_DAYS;

  // The same orders as the Orders page, with their lines and voids: all of
  // them, however many, so the totals are right.
  const orders = isTooLong ? null : await getOrdersBetween(from, to);
  // Today is still going: its numbers are as of now, and don't update by
  // themselves.
  const includesToday = to === today && orders !== null && orders.length > 0;

  return (
    <section aria-labelledby="summary-dates" className="flex flex-1 flex-col gap-6">
      {/* For screen readers; the picker below shows the same dates. */}
      <h2 id="summary-dates" className="sr-only">
        {isRange
          ? `Summary from ${formatCafeDay(from)} to ${formatCafeDay(to)}`
          : `Summary for ${formatCafeDay(day)}`}
      </h2>

      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        {isRange ? (
          <p className="flex h-12 items-center gap-2 whitespace-nowrap">
            <span className="font-semibold text-espresso-950">{rangeLabel(dates)}</span>
            <span className="text-roast-500 tabular-nums">
              {formatCafeDayShort(from)} – {formatCafeDayShort(to)}
            </span>
          </p>
        ) : (
          <DayPicker basePath="/dashboard/summary" day={day} today={today} />
        )}
        {includesToday && (
          <p className="text-roast-500 tabular-nums">
            {isRange ? "Includes today so far" : "So far today"}, as of{" "}
            {formatCafeTime(new Date().toISOString())}
          </p>
        )}
      </div>

      {isTooLong ? (
        <p role="alert" className="rounded-2xl bg-latte-100 px-5 py-4 font-medium text-espresso-900">
          A summary covers up to {MAX_SUMMARY_DAYS} days (about 3 months). Pick fewer days.
        </p>
      ) : !orders ? (
        <p role="alert" className="rounded-2xl bg-latte-100 px-5 py-4 font-medium text-espresso-900">
          The summary couldn&apos;t be loaded. Check the internet connection and refresh the page.
        </p>
      ) : orders.length === 0 ? (
        <SummaryEmpty shown={isRange ? "range" : day === today ? "today" : "day"} />
      ) : (
        <SummaryView summary={summarizeOrders(orders)} />
      )}
    </section>
  );
}
