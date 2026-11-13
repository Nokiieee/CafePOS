import { orderTypes } from "@/components/pos/bill";
import { formatCafeTime } from "@/lib/cafe-time";
import { formatPrice } from "@/lib/format-price";
import type { SavedOrder } from "@/lib/orders";

type OrderListProps = {
  orders: SavedOrder[];
  /** The order whose receipt is showing. */
  selectedId: string | null;
  onSelect: (id: string) => void;
};

// The day's orders, newest first: time, what was ordered, and the total.
// Each row is a button that shows that order's receipt.
export function OrderList({ orders, selectedId, onSelect }: OrderListProps) {
  return (
    <ul className="flex flex-col gap-1 rounded-3xl bg-white p-2 ring-1 ring-latte-200">
      {orders.map((order) => (
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

type OrderRowProps = {
  order: SavedOrder;
  isSelected: boolean;
  onSelect: () => void;
};

function OrderRow({ order, isSelected, onSelect }: OrderRowProps) {
  const itemCount = order.lines.reduce((count, line) => count + line.quantity, 0);
  const orderType = orderTypes.find((type) => type.value === order.orderType)?.label;
  // "2× Iced Latte, Fries": a quantity only when there's more than one.
  const summary = order.lines
    .map((line) => (line.quantity > 1 ? `${line.quantity}× ${line.name}` : line.name))
    .join(", ");

  return (
    <button
      type="button"
      aria-current={isSelected ? "true" : undefined}
      onClick={onSelect}
      // The highlight only shows from md up: on phones the receipt opens full-screen instead.
      className={`flex w-full items-center gap-4 rounded-2xl px-4 py-3.5 text-left transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-espresso-700 active:bg-latte-200 ${
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
      <span className="shrink-0 font-semibold text-espresso-700 tabular-nums">
        {formatPrice(order.totalCents)}
      </span>
    </button>
  );
}

/** Placeholder rows while the orders load. */
export function OrderListSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading orders" className="flex flex-col gap-4">
      <div className="h-6 w-64 animate-pulse rounded-lg bg-latte-100 motion-reduce:animate-none" />
      <div className="flex flex-col gap-1 rounded-3xl bg-white p-2 ring-1 ring-latte-200">
        {[0, 1, 2, 3].map((row) => (
          <div key={row} className="flex items-center gap-4 px-4 py-4">
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
