import type { Metadata } from "next";
import { Suspense } from "react";
import { DayPicker } from "@/components/orders/day-picker";
import { PageRail } from "@/components/pos/page-rail";
import { SignedInAs, SignedInAsFallback } from "@/components/pos/signed-in-as";
import { SummaryEmpty, SummarySkeleton, SummaryView } from "@/components/summary/summary-view";
import { requireAdmin } from "@/lib/auth";
import { cafeDayFromParam, cafeToday, formatCafeDay, formatCafeTime } from "@/lib/cafe-time";
import { getOrdersForDay } from "@/lib/orders";
import { summarizeDay } from "@/lib/summary";

export const metadata: Metadata = {
  title: "Summary · Cafe POS",
};

// The end-of-day summary for one day, for admins only. The day comes from
// the URL (?date=2026-11-17), and is today when there isn't one.
export default function SummaryPage({ searchParams }: PageProps<"/dashboard/summary">) {
  return (
    <div className="flex h-dvh bg-milk text-espresso-950">
      <PageRail current="summary" />

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
          <DaySummary searchParams={searchParams} />
        </Suspense>
      </main>
    </div>
  );
}

type DaySummaryProps = {
  searchParams: PageProps<"/dashboard/summary">["searchParams"];
};

async function DaySummary({ searchParams }: DaySummaryProps) {
  // Admins only. Signed-out visitors go to the login page and cashiers go
  // back to the register, even if they type this page's address.
  await requireAdmin();

  const { date } = await searchParams;
  const today = cafeToday();
  const day = cafeDayFromParam(date, today);
  const isToday = day === today;

  // The same orders as the Orders page, with their lines and voids.
  const orders = await getOrdersForDay(day);

  return (
    <section aria-labelledby="summary-day" className="flex flex-1 flex-col gap-6">
      {/* For screen readers; the picker below shows the same day. */}
      <h2 id="summary-day" className="sr-only">
        Summary for {formatCafeDay(day)}
      </h2>

      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <DayPicker basePath="/dashboard/summary" day={day} today={today} />
        {/* Today's numbers are worked out when the page loads; they don't
            update by themselves. */}
        {isToday && orders && orders.length > 0 && (
          <p className="text-roast-500 tabular-nums">
            So far today, as of {formatCafeTime(new Date().toISOString())}
          </p>
        )}
      </div>

      {!orders ? (
        <p role="alert" className="rounded-2xl bg-latte-100 px-5 py-4 font-medium text-espresso-900">
          The summary couldn&apos;t be loaded. Check the internet connection and refresh the page.
        </p>
      ) : orders.length === 0 ? (
        <SummaryEmpty isToday={isToday} />
      ) : (
        <SummaryView summary={summarizeDay(orders)} />
      )}
    </section>
  );
}
