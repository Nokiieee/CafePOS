import type { Metadata } from "next";
import { Suspense } from "react";
import { DayPicker } from "@/components/orders/day-picker";
import { OrderListSkeleton } from "@/components/orders/order-list";
import { OrdersToolbar } from "@/components/orders/orders-toolbar";
import { OrdersView } from "@/components/orders/orders-view";
import { SignedInAs, SignedInAsFallback } from "@/components/pos/signed-in-as";
import { getCurrentUser, getRole } from "@/lib/auth";
import { cafeDayFromParam, cafeToday, formatCafeDay, formatCafeDayShort } from "@/lib/cafe-time";
import { formatPrice } from "@/lib/format-price";
import {
  activeFilterCount,
  filterDays,
  MAX_SEARCH_RESULTS,
  parseOrderFilters,
  parseSearchQuery,
  type OrderFilters,
  type SearchQuery,
} from "@/lib/order-search";
import {
  getOrdersForDay,
  getRecentCashierNames,
  searchOrders,
  type SavedOrder,
} from "@/lib/orders";

export const metadata: Metadata = {
  title: "Orders · Cafe POS",
};

// Paid orders. By default one day at a time (?date=2026-11-13, today when
// there isn't one), with the day picker. Search text and filters narrow that
// day (?date=...&voided=only), or a range of days (?q=latte&range=7d).
// The rail around it comes from the Manage layout (app/dashboard/(manage)/layout.tsx).
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
        <OrdersContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

type OrdersContentProps = {
  searchParams: PageProps<"/dashboard/orders">["searchParams"];
};

// Reads the address, loads everything at once, then shows the toolbar and
// the orders.
async function OrdersContent({ searchParams }: OrdersContentProps) {
  // Every protected page checks the session itself, not just proxy.ts.
  const user = await getCurrentUser();

  const params = await searchParams;
  const today = cafeToday();
  const day = cafeDayFromParam(params.date, today);
  const query = parseSearchQuery(params.q);
  const filters = parseOrderFilters(params, today);
  // The search as typed, to put back in the box.
  const searchText = query && typeof params.q === "string" ? params.q.trim() : "";
  // Search text or any filter narrows the list; a plain day shows everything.
  const isFiltered = query !== null || activeFilterCount(filters) > 0;
  const days = filterDays(filters, today, day);

  // All at once: none of these needs another's answer. A plain day loads
  // every order of that day; anything else asks Supabase for the matches.
  const [role, cashiers, dayOrders, result] = await Promise.all([
    getRole(user),
    getRecentCashierNames(today),
    isFiltered ? null : getOrdersForDay(day),
    isFiltered ? searchOrders(query, days, filters) : null,
  ]);
  const isAdmin = role === "admin";
  // null: they couldn't be loaded.
  const orders = isFiltered ? (result?.orders ?? null) : dayOrders;
  const hasMore = result?.hasMore ?? false;
  // A range of days (7 days, 30 days...) instead of the one day.
  const isRange = filters.range !== "day";

  return (
    <div className="flex flex-1 flex-col gap-6">
      {/* The toolbar comes first whatever is shown, so it stays on screen
          (it doesn't reload) when the results change. */}
      <OrdersToolbar
        dayPicker={<DayPicker basePath="/dashboard/orders" day={day} today={today} />}
        day={day}
        today={today}
        searchText={searchText}
        filters={filters}
        cashiers={cashiers}
      />

      <section aria-labelledby="orders-heading" className="flex flex-1 flex-col">
        {/* For screen readers; the toolbar shows the same day or range. */}
        <h2 id="orders-heading" className="sr-only">
          {isFiltered ? "Matching orders" : `Orders for ${formatCafeDay(day)}`}
        </h2>

        {orders ? (
          // key: a different day, search or filter starts fresh, with its
          // newest order picked.
          <OrdersView
            key={`${day}:${searchText}:${JSON.stringify(filters)}`}
            orders={orders}
            today={today}
            isAdmin={isAdmin}
            // A range spans several days, so its list gets day headings.
            groupByDay={isRange}
            listHeader={
              <>
                <OrderCounts orders={orders} isAdmin={isAdmin} isPartial={hasMore} />
                {hasMore && (
                  <p className="mt-1">
                    Showing the newest {MAX_SEARCH_RESULTS}. Search for something more specific or
                    pick fewer days to see the rest.
                  </p>
                )}
              </>
            }
            empty={emptyMessage({ isFiltered, query, filters, day, today, days })}
          />
        ) : (
          <p role="alert" className="rounded-2xl bg-latte-100 px-5 py-4 font-medium text-espresso-900">
            {isFiltered
              ? "The search couldn't be finished. Check the internet connection and try again."
              : "The orders couldn't be loaded. Check the internet connection and refresh the page."}
          </p>
        )}
      </section>
    </div>
  );
}

type EmptyMessageInput = {
  isFiltered: boolean;
  query: SearchQuery | null;
  filters: OrderFilters;
  day: string;
  today: string;
  days: { from: string; to: string };
};

// What to say when nothing is listed, naming what was looked for and where:
// "No orders with “mocha”. Nothing in the last 7 days. Check the spelling..."
function emptyMessage({ isFiltered, query, filters, day, today, days }: EmptyMessageInput) {
  if (!isFiltered) {
    return {
      title: day === today ? "No orders yet today" : "No orders on this day",
      description: "Every paid bill shows up here, newest first.",
    };
  }

  const title = !query
    ? "No matching orders"
    : query.kind === "amount"
      ? `No orders of ${formatPrice(query.cents)}`
      : `No orders with “${query.text}”`;

  const where =
    filters.range === "day"
      ? day === today
        ? "today"
        : `on ${formatCafeDayShort(day)}`
      : filters.range === "custom"
        ? `from ${formatCafeDayShort(days.from)} to ${formatCafeDayShort(days.to)}`
        : filters.range === "month"
          ? "this month"
          : filters.range === "30d"
            ? "in the last 30 days"
            : "in the last 7 days";
  const hasOtherFilters =
    filters.cashier !== null || filters.orderType !== "all" || filters.voided !== "all";
  const hint =
    query?.kind === "item"
      ? "Check the spelling, or try part of the name."
      : "Try other dates or filters.";

  return {
    title,
    description: `Nothing ${where}${hasOtherFilters ? " with these filters" : ""}. ${hint}`,
  };
}

type OrderCountsProps = {
  orders: SavedOrder[];
  isAdmin: boolean;
  /** Only the newest results were loaded, so the totals would be too low. */
  isPartial?: boolean;
};

// "12 orders · 1 voided · $96.50 in sales", the list card's header band.
function OrderCounts({ orders, isAdmin, isPartial = false }: OrderCountsProps) {
  // Voided orders stay in the list, but they aren't sales.
  const voidedCount = orders.filter((order) => order.voided).length;
  const sales = orders
    .filter((order) => !order.voided)
    .reduce((sum, order) => sum + order.totalCents, 0);

  return (
    <p className="text-roast-500">
      {orders.length}
      {isPartial && "+"} {orders.length === 1 && !isPartial ? "order" : "orders"}
      {voidedCount > 0 && <> · {voidedCount} voided</>}
      {/* Sales are for admins only: the cafe takes cash only, so sales say
          how much money is in the drawer. A partial list would give a wrong
          total, so it's left out then. */}
      {isAdmin && !isPartial && (
        <>
          {" · "}
          <span className="font-semibold text-espresso-900 tabular-nums">{formatPrice(sales)}</span>{" "}
          in sales
        </>
      )}
    </p>
  );
}
