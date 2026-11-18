import type { Metadata } from "next";
import { Suspense } from "react";
import { DayPicker } from "@/components/orders/day-picker";
import { OrderListSkeleton } from "@/components/orders/order-list";
import { OrdersView } from "@/components/orders/orders-view";
import { SignedInAs, SignedInAsFallback } from "@/components/pos/signed-in-as";
import { getCurrentUser, getRole } from "@/lib/auth";
import { cafeDayFromParam, cafeToday, formatCafeDay } from "@/lib/cafe-time";
import { formatPrice } from "@/lib/format-price";
import { getOrdersForDay } from "@/lib/orders";

export const metadata: Metadata = {
  title: "Orders · Cafe POS",
};

// Paid orders for one day. The day comes from the URL (?date=2026-11-13),
// and is today when there isn't one. The rail around it comes from the
// Manage layout (app/dashboard/(manage)/layout.tsx).
export default function OrdersPage({ searchParams }: PageProps<"/dashboard/orders">) {
  return (
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
  );
}

type DayOrdersProps = {
  searchParams: PageProps<"/dashboard/orders">["searchParams"];
};

async function DayOrders({ searchParams }: DayOrdersProps) {
  // Every protected page checks the session itself, not just proxy.ts.
  const user = await getCurrentUser();

  const { date } = await searchParams;
  const today = cafeToday();
  const day = cafeDayFromParam(date, today);
  const isToday = day === today;

  // Both at once: neither needs the other's answer.
  const [role, orders] = await Promise.all([getRole(user), getOrdersForDay(day)]);
  const isAdmin = role === "admin";
  // Voided orders stay in the list, but they aren't sales.
  const voidedCount = orders?.filter((order) => order.voided).length ?? 0;
  const sales =
    orders
      ?.filter((order) => !order.voided)
      .reduce((sum, order) => sum + order.totalCents, 0) ?? 0;

  return (
    <section aria-labelledby="orders-day" className="flex flex-1 flex-col gap-4">
      {/* For screen readers; the picker below shows the same day. */}
      <h2 id="orders-day" className="sr-only">
        Orders for {formatCafeDay(day)}
      </h2>

      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <DayPicker basePath="/dashboard/orders" day={day} today={today} />
        {orders && (
          <p className="text-roast-500">
            {orders.length} {orders.length === 1 ? "order" : "orders"}
            {voidedCount > 0 && <> · {voidedCount} voided</>}
            {/* Sales are for admins only: the cafe takes cash only, so the
                day's sales say how much money is in the drawer. */}
            {isAdmin && (
              <>
                {" · "}
                <span className="font-semibold text-espresso-900 tabular-nums">
                  {formatPrice(sales)}
                </span>{" "}
                in sales
              </>
            )}
          </p>
        )}
      </div>

      {orders ? (
        // key={day}: a different day starts fresh, with its newest order picked.
        <OrdersView
          key={day}
          orders={orders}
          isToday={isToday}
          canVoid={isAdmin && isToday}
        />
      ) : (
        <p role="alert" className="rounded-2xl bg-latte-100 px-5 py-4 font-medium text-espresso-900">
          The orders couldn&apos;t be loaded. Check the internet connection and refresh the page.
        </p>
      )}
    </section>
  );
}
