import { PiReceipt } from "react-icons/pi";
import { orderTypes } from "@/components/pos/bill";
import { formatCafeTime } from "@/lib/cafe-time";
import { formatPrice } from "@/lib/format-price";
import type { SavedOrder } from "@/lib/orders";

type OrderListProps = {
  orders: SavedOrder[];
  isToday: boolean;
};

// The day's orders, newest first: time, what was ordered, and the total.
export function OrderList({ orders, isToday }: OrderListProps) {
  if (orders.length === 0) {
    return (
      <section className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-latte-100 text-espresso-700">
          <PiReceipt aria-hidden className="size-8" />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-lg font-semibold">
            {isToday ? "No orders yet today" : "No orders on this day"}
          </p>
          <p className="max-w-sm text-roast-500">
            Every paid bill shows up here, newest first.
          </p>
        </div>
      </section>
    );
  }

  return (
    <ul className="divide-y divide-latte-200 rounded-3xl bg-white px-5 ring-1 ring-latte-200">
      {orders.map((order) => (
        <OrderRow key={order.id} order={order} />
      ))}
    </ul>
  );
}

function OrderRow({ order }: { order: SavedOrder }) {
  const itemCount = order.lines.reduce((count, line) => count + line.quantity, 0);
  const orderType = orderTypes.find((type) => type.value === order.orderType)?.label;
  // "2× Iced Latte, Fries": a quantity only when there's more than one.
  const summary = order.lines
    .map((line) => (line.quantity > 1 ? `${line.quantity}× ${line.name}` : line.name))
    .join(", ");

  return (
    <li className="flex items-center gap-4 py-3.5">
      <p className="w-20 shrink-0 font-semibold text-espresso-950 tabular-nums">
        {formatCafeTime(order.createdAt)}
      </p>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-espresso-950">{summary}</p>
        <p className="mt-0.5 truncate text-sm text-roast-500">
          {orderType} · {order.cashierName} · {itemCount} {itemCount === 1 ? "item" : "items"}
        </p>
      </div>
      <p className="shrink-0 font-semibold text-espresso-700 tabular-nums">
        {formatPrice(order.totalCents)}
      </p>
    </li>
  );
}

/** Placeholder rows while the orders load. */
export function OrderListSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading orders" className="flex flex-col gap-4">
      <div className="h-6 w-64 animate-pulse rounded-lg bg-latte-100 motion-reduce:animate-none" />
      <div className="divide-y divide-latte-200 rounded-3xl bg-white px-5 ring-1 ring-latte-200">
        {[0, 1, 2, 3].map((row) => (
          <div key={row} className="flex items-center gap-4 py-4">
            <div className="h-5 w-16 animate-pulse rounded-md bg-latte-100 motion-reduce:animate-none" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-2/3 animate-pulse rounded-md bg-latte-100 motion-reduce:animate-none" />
              <div className="h-3.5 w-1/3 animate-pulse rounded-md bg-latte-100 motion-reduce:animate-none" />
            </div>
            <div className="h-5 w-14 animate-pulse rounded-md bg-latte-100 motion-reduce:animate-none" />
          </div>
        ))}
      </div>
    </div>
  );
}
