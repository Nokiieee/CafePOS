import type { Metadata } from "next";
import { Suspense } from "react";
import { OrderList, OrderListSkeleton } from "@/components/orders/order-list";
import { OrdersRail } from "@/components/orders/orders-rail";
import { SignedInAs, SignedInAsFallback } from "@/components/pos/signed-in-as";
import { getCurrentUser } from "@/lib/auth";
import { cafeToday, formatCafeDay, isCafeDay } from "@/lib/cafe-time";
import { formatPrice } from "@/lib/format-price";
import { getOrdersForDay } from "@/lib/orders";

export const metadata: Metadata = {
  title: "Orders · Cafe POS",
};

// Paid orders for one day. The day comes from the URL (?date=2026-11-13),
// and is today when there isn't one.
export default function OrdersPage({ searchParams }: PageProps<"/dashboard/orders">) {
  return (
    <div className="flex h-dvh bg-milk text-espresso-950">
      <OrdersRail />

      <main className="flex min-w-0 flex-1 flex-col gap-6 overflow-y-auto px-6 pt-8 pb-8 [scrollbar-color:var(--color-latte-300)_transparent] sm:px-10">
        <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <h1 className="text-3xl font-semibold tracking-tight">Orders</h1>
          <div className="min-w-0 max-w-full">
            <Suspense fallback={<SignedInAsFallback />}>
              <SignedInAs />
            </Suspense>
          </div>
        </header>

        {/* Reading the URL and the database depends on the request, so this
            part streams in after the page's frame (Cache Components rule). */}
        <Suspense fallback={<OrderListSkeleton />}>
          <DayOrders searchParams={searchParams} />
        </Suspense>
      </main>
    </div>
  );
}

type DayOrdersProps = {
  searchParams: PageProps<"/dashboard/orders">["searchParams"];
};

async function DayOrders({ searchParams }: DayOrdersProps) {
  // Every protected page checks the session itself, not just proxy.ts.
  await getCurrentUser();

  const { date } = await searchParams;
  const today = cafeToday();
  // A missing, broken or future date shows today instead.
  const day = isCafeDay(date) && date <= today ? date : today;
  const isToday = day === today;

  const orders = await getOrdersForDay(day);

  if (!orders) {
    return (
      <p role="alert" className="rounded-2xl bg-latte-100 px-5 py-4 font-medium text-espresso-900">
        The orders couldn&apos;t be loaded. Check the internet connection and refresh the page.
      </p>
    );
  }

  const sales = orders.reduce((sum, order) => sum + order.totalCents, 0);

  return (
    <section aria-label="Orders for the day" className="flex flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 className="text-lg font-semibold">
          {isToday && <span className="text-espresso-700">Today · </span>}
          {formatCafeDay(day)}
        </h2>
        <p className="text-roast-500">
          {orders.length} {orders.length === 1 ? "order" : "orders"} ·{" "}
          <span className="font-semibold text-espresso-900 tabular-nums">{formatPrice(sales)}</span>{" "}
          in sales
        </p>
      </div>

      <OrderList orders={orders} isToday={isToday} />
    </section>
  );
}
