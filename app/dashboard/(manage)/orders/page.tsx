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
  type OrderSearchResult,
  type SavedOrder,
} from "@/lib/orders";

export const metadata: Metadata = {
  title: "Orders · Cafe POS",
};

// Paid orders: one day at a time (?date=2026-11-13, today when there isn't
// one), or search results (?q=latte, and/or filters like ?voided=only) across
// a range of days. The rail around it comes from the Manage layout
// (app/dashboard/(manage)/layout.tsx).
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
// either one day's orders (the normal view) or the search results.
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
  // Any search text or filter turns the page into search results.
  const isSearching = query !== null || activeFilterCount(filters) > 0;
  const days = filterDays(filters, today);

  // All at once: none of these needs another's answer.
  const [role, cashiers, dayOrders, searchResult] = await Promise.all([
    getRole(user),
    getRecentCashierNames(today),
    isSearching ? null : getOrdersForDay(day),
    isSearching ? searchOrders(query, days, filters) : null,
  ]);
  const isAdmin = role === "admin";

  // The toolbar comes first in both views, so it stays on screen (and an open
  // filters panel stays open) when the page switches between them.
  return (
    <div className="flex flex-1 flex-col gap-6">
      <OrdersToolbar
        dayPicker={<DayPicker basePath="/dashboard/orders" day={day} today={today} />}
        isSearching={isSearching}
        searchText={searchText}
        filters={filters}
        cashiers={cashiers}
        today={today}
      />

      {isSearching ? (
        <SearchResults
          result={searchResult}
          query={query}
          searchText={searchText}
          filters={filters}
          days={days}
          today={today}
          isAdmin={isAdmin}
        />
      ) : (
        <DayOrders orders={dayOrders} day={day} today={today} isAdmin={isAdmin} />
      )}
    </div>
  );
}

type DayOrdersProps = {
  /** null: they couldn't be loaded. */
  orders: SavedOrder[] | null;
  day: string;
  today: string;
  isAdmin: boolean;
};

// One day's orders. This is the normal view.
function DayOrders({ orders, day, today, isAdmin }: DayOrdersProps) {
  return (
    <section aria-labelledby="orders-heading" className="flex flex-1 flex-col">
      {/* For screen readers; the day picker shows the same day. */}
      <h2 id="orders-heading" className="sr-only">
        Orders for {formatCafeDay(day)}
      </h2>

      {orders ? (
        // key={day}: a different day starts fresh, with its newest order picked.
        <OrdersView
          key={day}
          orders={orders}
          today={today}
          isAdmin={isAdmin}
          listHeader={<OrderCounts orders={orders} isAdmin={isAdmin} />}
          empty={{
            title: day === today ? "No orders yet today" : "No orders on this day",
            description: "Every paid bill shows up here, newest first.",
          }}
        />
      ) : (
        <LoadError message="The orders couldn't be loaded. Check the internet connection and refresh the page." />
      )}
    </section>
  );
}

type SearchResultsProps = {
  /** null: the search couldn't be finished. */
  result: OrderSearchResult | null;
  query: SearchQuery | null;
  searchText: string;
  filters: OrderFilters;
  days: { from: string; to: string };
  today: string;
  isAdmin: boolean;
};

// Orders matching the search text and filters, newest first, under day headings.
function SearchResults({ result, query, searchText, filters, days, today, isAdmin }: SearchResultsProps) {
  // "“latte”" or "$12.75", for the headings below.
  const what = query
    ? query.kind === "amount"
      ? formatPrice(query.cents)
      : `“${query.text}”`
    : null;
  const title = !query
    ? "No matching orders"
    : `No orders ${query.kind === "amount" ? "of" : "with"} ${what}`;
  const hasFilters = activeFilterCount(filters) > 0;

  return (
    <section aria-labelledby="orders-heading" className="flex flex-1 flex-col">
      <h2 id="orders-heading" className="sr-only">
        {what ? `Orders ${query?.kind === "amount" ? "of" : "with"} ${what}` : "Filtered orders"}
      </h2>

      {result ? (
        // key: a new search starts fresh, with its newest order picked.
        <OrdersView
          key={`search:${searchText}:${JSON.stringify(filters)}`}
          orders={result.orders}
          today={today}
          isAdmin={isAdmin}
          groupByDay
          listHeader={
            <>
              <OrderCounts orders={result.orders} isAdmin={isAdmin} isPartial={result.hasMore} />
              {result.hasMore && (
                <p className="mt-1">
                  Showing the newest {MAX_SEARCH_RESULTS}. Search for something more specific or
                  pick fewer days to see the rest.
                </p>
              )}
            </>
          }
          empty={{
            title,
            description: `Nothing in ${rangeInWords(filters, days)}${hasFilters ? " with these filters" : ""}. ${
              query?.kind === "item"
                ? "Check the spelling, or try part of the name."
                : "Try other dates or filters."
            }`,
          }}
        />
      ) : (
        <LoadError message="The search couldn't be finished. Check the internet connection and try again." />
      )}
    </section>
  );
}

// "the last 7 days", "this month", "Nov 1 – Nov 15", for the empty message.
function rangeInWords(filters: OrderFilters, days: { from: string; to: string }): string {
  switch (filters.range) {
    case "30d":
      return "the last 30 days";
    case "month":
      return "this month";
    case "custom":
      return `${formatCafeDayShort(days.from)} – ${formatCafeDayShort(days.to)}`;
    default:
      return "the last 7 days";
  }
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

function LoadError({ message }: { message: string }) {
  return (
    <p role="alert" className="rounded-2xl bg-latte-100 px-5 py-4 font-medium text-espresso-900">
      {message}
    </p>
  );
}
