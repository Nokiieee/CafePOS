import type { Metadata } from "next";
import { Suspense } from "react";
import { DayPicker } from "@/components/orders/day-picker";
import { PageRail } from "@/components/pos/page-rail";
import { SignedInAs, SignedInAsFallback } from "@/components/pos/signed-in-as";
import { requireAdmin } from "@/lib/auth";
import { cafeDayFromParam, cafeToday, formatCafeDay } from "@/lib/cafe-time";

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

  return (
    <section aria-labelledby="summary-day" className="flex flex-1 flex-col gap-4">
      {/* For screen readers; the picker below shows the same day. */}
      <h2 id="summary-day" className="sr-only">
        Summary for {formatCafeDay(day)}
      </h2>

      <DayPicker basePath="/dashboard/summary" day={day} today={today} />

      <p className="text-roast-500">The day&apos;s numbers come in the next step.</p>
    </section>
  );
}

/** Shown while the summary loads. */
function SummarySkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading the summary" className="flex flex-col gap-4">
      <div className="h-11 w-80 max-w-full animate-pulse rounded-xl bg-latte-100 motion-reduce:animate-none" />
    </div>
  );
}
