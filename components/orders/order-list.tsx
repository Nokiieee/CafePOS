import type { ReactNode } from "react";
import { orderTypes } from "@/components/pos/bill";
import { cafeDayOf, formatCafeDay, formatCafeTime, shiftCafeDay } from "@/lib/cafe-time";
import { formatPrice } from "@/lib/format-price";
import type { SavedOrder } from "@/lib/orders";

type OrderListProps = {
  orders: SavedOrder[];
  /** The order whose receipt is showing. */
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Search results span several days, so they're grouped under day headings. */
  groupByDay?: boolean;
  /** Today at the cafe, for the "Today" and "Yesterday" headings. */
  today: string;
  /** The card's top band, e.g. "4 orders · 1 voided · $104.25 in sales". */
  header?: ReactNode;
};

// Orders, newest first, in one white card: an optional header band, then
// full-width rows split by thin lines. Each row is a button that shows that
// order's receipt. overflow-hidden keeps the selected row's fill inside the
// card's rounded corners.
export function OrderList({
  orders,
  selectedId,
  onSelect,
  groupByDay = false,
  today,
  header,
}: OrderListProps) {
  function rows(list: SavedOrder[]) {
    return (
      <ul className="divide-y divide-latte-200">
        {list.map((order) => (
          <li key={order.id}>
            <OrderRow
              order={order}
              isSelected={order.id === selectedId}
              onSelect={() => onSelect(order.id)}
            />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl bg-white ring-1 ring-latte-200">
      {header && (
        <div className="border-b border-latte-200 bg-milk px-6 py-3.5 text-sm text-roast-500">
          {header}
        </div>
      )}

      {groupByDay
        ? groupOrdersByDay(orders).map(({ day, orders: dayOrders }, index) => (
            <section
              key={day}
              aria-labelledby={`orders-on-${day}`}
              className={index > 0 ? "border-t border-latte-200" : undefined}
            >
              <h3
                id={`orders-on-${day}`}
                className="border-b border-latte-200 bg-milk px-6 py-2 text-sm font-semibold text-roast-500"
              >
                {dayHeading(day, today)}
              </h3>
              {rows(dayOrders)}
            </section>
          ))
        : rows(orders)}
    </div>
  );
}

// Consecutive orders on the same cafe day, in the order given (newest first).
function groupOrdersByDay(orders: SavedOrder[]): { day: string; orders: SavedOrder[] }[] {
  const groups: { day: string; orders: SavedOrder[] }[] = [];
  for (const order of orders) {
    const day = cafeDayOf(order.createdAt);
    const last = groups[groups.length - 1];
    if (last?.day === day) {
      last.orders.push(order);
    } else {
      groups.push({ day, orders: [order] });
    }
  }
  return groups;
}

// "Today", "Yesterday", or "Monday, November 16, 2026".
function dayHeading(day: string, today: string): string {
  if (day === today) return "Today";
  if (day === shiftCafeDay(today, -1)) return "Yesterday";
  return formatCafeDay(day);
}

type OrderRowProps = {
  order: SavedOrder;
  isSelected: boolean;
  onSelect: () => void;
};

function OrderRow({ order, isSelected, onSelect }: OrderRowProps) {
  const itemCount = order.lines.reduce((count, line) => count + line.quantity, 0);
  const orderType = orderTypes.find((type) => type.value === order.orderType)?.label;
  const summary = orderSummary(order);

  return (
    <button
      type="button"
      aria-current={isSelected ? "true" : undefined}
      onClick={onSelect}
      // The highlight only shows from md up: on phones the receipt opens
      // full-screen instead. The focus ring is inset, so the card's rounded
      // corners don't clip it.
      className={`flex w-full items-center gap-4 px-6 py-4 text-left transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-espresso-700 focus-visible:ring-inset active:bg-latte-200 ${
        isSelected ? "md:bg-latte-100" : "hover:bg-latte-100/60"
      }`}
    >
      <span className="w-20 shrink-0 font-semibold text-espresso-950 tabular-nums">
        {formatCafeTime(order.createdAt)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium text-espresso-950">{summary}</span>
        <span className="mt-0.5 block truncate text-sm text-roast-500">
          {orderType} · {order.cashierName} · {itemCount} {itemCount === 1 ? "item" : "items"}
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1">
        {/* A voided order's total is crossed out: it no longer counts as a sale. */}
        <span
          className={`font-semibold tabular-nums ${
            order.voided ? "text-roast-500 line-through" : "text-espresso-700"
          }`}
        >
          {formatPrice(order.totalCents)}
        </span>
        {order.voided && (
          <span className="rounded-md bg-red-50 px-1.5 py-0.5 text-xs font-semibold text-red-800">
            Voided
          </span>
        )}
      </span>
    </button>
  );
}

/** "2× Iced Latte, Fries": a quantity only when there's more than one. */
export function orderSummary(order: SavedOrder): string {
  return order.lines
    .map((line) => (line.quantity > 1 ? `${line.quantity}× ${line.name}` : line.name))
    .join(", ");
}

/** Placeholder shapes while the orders load: the toolbar, then the list card. */
export function OrderListSkeleton() {
  const block = "animate-pulse bg-latte-100 motion-reduce:animate-none";

  return (
    <div aria-busy="true" aria-label="Loading orders" className="flex flex-col gap-6">
      {/* The toolbar: the day picker, then the search box and Filters. */}
      <div className="flex flex-wrap gap-3">
        <div className={`h-12 w-80 max-w-full rounded-2xl ${block}`} />
        <div className="flex min-w-[min(24rem,100%)] flex-1 gap-3">
          <div className={`h-12 flex-1 rounded-2xl ${block}`} />
          <div className={`h-12 w-28 rounded-2xl ${block}`} />
        </div>
      </div>
      <div className="overflow-hidden rounded-3xl bg-white ring-1 ring-latte-200">
        <div className="border-b border-latte-200 bg-milk px-6 py-4">
          <div className={`h-4 w-48 rounded-md ${block}`} />
        </div>
        <div className="divide-y divide-latte-200">
          {[0, 1, 2, 3].map((row) => (
            <div key={row} className="flex items-center gap-4 px-6 py-5">
              <div className={`h-5 w-16 rounded-md ${block}`} />
              <div className="flex-1 space-y-2">
                <div className={`h-4 w-2/3 rounded-md ${block}`} />
                <div className={`h-3.5 w-1/3 rounded-md ${block}`} />
              </div>
              <div className={`h-5 w-14 rounded-md ${block}`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
