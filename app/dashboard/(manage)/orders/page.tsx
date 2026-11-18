import type { User } from "@supabase/supabase-js";
import type { Metadata } from "next";
import { Suspense } from "react";
import { DayPicker } from "@/components/orders/day-picker";
import { OrderListSkeleton } from "@/components/orders/order-list";
import { OrderSearchBox } from "@/components/orders/order-search";
import { OrdersView } from "@/components/orders/orders-view";
import { SignedInAs, SignedInAsFallback } from "@/components/pos/signed-in-as";
import { getCurrentUser, getRole } from "@/lib/auth";
import { cafeDayFromParam, cafeToday, formatCafeDay, formatCafeDayShort } from "@/lib/cafe-time";
import { formatPrice } from "@/lib/format-price";
import {
  MAX_SEARCH_RESULTS,
  parseSearchQuery,
  SEARCH_DAYS,
  searchDays,
  type SearchQuery,
} from "@/lib/order-search";
import { getOrdersForDay, searchOrders, type SavedOrder } from "@/lib/orders";

export const metadata: Metadata = {
  title: "Orders · Cafe POS",
};

// Paid orders: one day at a time (?date=2026-11-13, today when there isn't
// one), or the results of a search (?q=latte) across the last few days.
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

// The search box, then either one day's orders (the normal view) or the
// results of a search.
async function OrdersContent({ searchParams }: OrdersContentProps) {
  // Every protected page checks the session itself, not just proxy.ts.
  const user = await getCurrentUser();

  const { date, q } = await searchParams;
  const today = cafeToday();
  const query = parseSearchQuery(q);
  // The search as typed, to put back in the box. Empty for the day view.
  const searchText = query && typeof q === "string" ? q.trim() : "";

  return (
    <div className="flex flex-1 flex-col gap-4">
      {/* key: going Back or Forward to another search refills the box. */}
      <OrderSearchBox key={searchText} initialText={searchText} />

      {query ? (
        <SearchResults query={query} searchText={searchText} today={today} user={user} />
      ) : (
        <DayOrders day={cafeDayFromParam(date, today)} today={today} user={user} />
      )}
    </div>
  );
}

type DayOrdersProps = {
  day: string;
  today: string;
  user: User;
};

// One day's orders, with the day picker. This is the normal view.
async function DayOrders({ day, today, user }: DayOrdersProps) {
  // Both at once: neither needs the other's answer.
  const [role, orders] = await Promise.all([getRole(user), getOrdersForDay(day)]);
  const isAdmin = role === "admin";

  return (
    <section aria-labelledby="orders-heading" className="flex flex-1 flex-col gap-4">
      {/* For screen readers; the picker below shows the same day. */}
      <h2 id="orders-heading" className="sr-only">
        Orders for {formatCafeDay(day)}
      </h2>

      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <DayPicker basePath="/dashboard/orders" day={day} today={today} />
        {orders && <OrderCounts orders={orders} isAdmin={isAdmin} />}
      </div>

      {orders ? (
        // key={day}: a different day starts fresh, with its newest order picked.
        <OrdersView
          key={day}
          orders={orders}
          today={today}
          isAdmin={isAdmin}
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
  query: SearchQuery;
  searchText: string;
  today: string;
  user: User;
};

// Orders from the last SEARCH_DAYS days matching the search, newest first,
// under day headings.
async function SearchResults({ query, searchText, today, user }: SearchResultsProps) {
  const days = searchDays(today);
  const [role, result] = await Promise.all([getRole(user), searchOrders(query, days)]);
  const isAdmin = role === "admin";
  // "“latte”" or "$12.75", for the headings below.
  const what = query.kind === "amount" ? formatPrice(query.cents) : `“${query.text}”`;

  return (
    <section aria-labelledby="orders-heading" className="flex flex-1 flex-col gap-4">
      <h2 id="orders-heading" className="sr-only">
        Orders {query.kind === "amount" ? "of" : "with"} {what}
      </h2>

      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-3">
        <p className="font-semibold text-espresso-950">
          Last {SEARCH_DAYS} days
          <span className="font-normal text-roast-500 tabular-nums">
            {" · "}
            {formatCafeDayShort(days.from)} – {formatCafeDayShort(days.to)}
          </span>
        </p>
        {result && <OrderCounts orders={result.orders} isAdmin={isAdmin} isPartial={result.hasMore} />}
      </div>

      {result?.hasMore && (
        <p className="rounded-2xl bg-latte-100 px-5 py-3 text-sm font-medium text-espresso-900">
          Showing the newest {MAX_SEARCH_RESULTS} orders. Search for something more specific to see
          the rest.
        </p>
      )}

      {result ? (
        // key: a new search starts fresh, with its newest order picked.
        <OrdersView
          key={`search:${searchText}`}
          orders={result.orders}
          today={today}
          isAdmin={isAdmin}
          groupByDay
          empty={{
            title: `No orders ${query.kind === "amount" ? "of" : "with"} ${what}`,
            description:
              query.kind === "amount"
                ? `No order in the last ${SEARCH_DAYS} days had that total.`
                : `Nothing in the last ${SEARCH_DAYS} days. Check the spelling, or try part of the name.`,
          }}
        />
      ) : (
        <LoadError message="The search couldn't be finished. Check the internet connection and try again." />
      )}
    </section>
  );
}

type OrderCountsProps = {
  orders: SavedOrder[];
  isAdmin: boolean;
  /** Only the newest results were loaded, so the totals would be too low. */
  isPartial?: boolean;
};

// "12 orders · 1 voided · $96.50 in sales" above the list.
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
