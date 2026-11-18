import type { ReactNode } from "react";
import { PiChartBar } from "react-icons/pi";
import { formatCafeTime } from "@/lib/cafe-time";
import { formatPrice } from "@/lib/format-price";
import type { DaySummary } from "@/lib/summary";

// The end-of-day summary's sections: the four headline numbers, then what
// sold on the left and the breakdowns on the right (one column on phones).
// Nothing here can be tapped, so it's drawn on the server.
export function SummaryView({ summary }: { summary: DaySummary }) {
  return (
    <div className="flex flex-col gap-6">
      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Sales" value={formatPrice(summary.salesCents)} isMain />
        <Stat label="Orders" value={summary.orderCount} />
        <Stat label="Average order" value={formatPrice(summary.averageCents)} />
        <Stat label="Items sold" value={summary.itemsSold} />
      </dl>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <ItemsCard items={summary.items} />
        <div className="flex flex-col gap-6">
          <OrderTypesCard orderTypes={summary.orderTypes} />
          <CashiersCard cashiers={summary.cashiers} />
          <VoidsCard voids={summary.voids} />
        </div>
      </div>
    </div>
  );
}

type StatProps = {
  label: string;
  value: ReactNode;
  /** Sales: the page's one dark tile, like the bill's Total block. */
  isMain?: boolean;
};

function Stat({ label, value, isMain = false }: StatProps) {
  return (
    <div
      className={`rounded-2xl px-5 py-4 ${
        isMain ? "bg-espresso-700 text-milk" : "bg-white ring-1 ring-latte-200"
      }`}
    >
      <dt className={`text-sm font-medium ${isMain ? "text-latte-200" : "text-roast-500"}`}>
        {label}
      </dt>
      <dd className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">{value}</dd>
    </div>
  );
}

type CardProps = {
  title: string;
  /** A short note at the right of the title, like "1 order · $10.00". */
  aside?: ReactNode;
  children: ReactNode;
};

function Card({ title, aside, children }: CardProps) {
  // Named by its title, so screen readers can jump between the sections.
  const titleId = `summary-${title.toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <section
      aria-labelledby={titleId}
      className="rounded-3xl bg-white px-5 py-5 ring-1 ring-latte-200 sm:px-6"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 id={titleId} className="text-lg font-semibold">
          {title}
        </h3>
        {aside && <p className="text-sm text-roast-500 tabular-nums">{aside}</p>}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function ItemsCard({ items }: { items: DaySummary["items"] }) {
  return (
    <Card title="Items sold">
      {items.length === 0 ? (
        <p className="text-roast-500">Nothing sold.</p>
      ) : (
        <table className="w-full text-left">
          <thead>
            <tr className="text-sm text-roast-500">
              <th className="pb-2 font-medium">Item</th>
              <th className="pb-2 pl-4 text-right font-medium">Sold</th>
              <th className="pb-2 pl-4 text-right font-medium">Sales</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-latte-200">
            {items.map((item) => (
              <tr key={item.itemId}>
                <td className="py-2.5 font-medium">{item.name}</td>
                <td className="py-2.5 pl-4 text-right tabular-nums">{item.quantity}</td>
                <td className="py-2.5 pl-4 text-right font-semibold text-espresso-700 tabular-nums">
                  {formatPrice(item.salesCents)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}

function OrderTypesCard({ orderTypes }: { orderTypes: DaySummary["orderTypes"] }) {
  return (
    <Card title="Dine In and Take Out">
      <dl className="divide-y divide-latte-200">
        {orderTypes.map((type) => (
          <div key={type.orderType} className="flex items-baseline gap-3 py-2.5">
            <dt className="flex-1 font-medium">{type.label}</dt>
            <dd className="text-roast-500 tabular-nums">{plural(type.orders, "order")}</dd>
            <dd className="w-24 text-right font-semibold text-espresso-700 tabular-nums">
              {formatPrice(type.salesCents)}
            </dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

function CashiersCard({ cashiers }: { cashiers: DaySummary["cashiers"] }) {
  return (
    <Card title="By cashier">
      <table className="w-full text-left">
        <thead>
          <tr className="text-sm text-roast-500">
            <th className="pb-2 font-medium">Cashier</th>
            <th className="pb-2 pl-4 text-right font-medium">Orders</th>
            <th className="pb-2 pl-4 text-right font-medium">Sales</th>
            <th className="pb-2 pl-4 text-right font-medium">Voids</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-latte-200">
          {cashiers.map((cashier) => (
            <tr key={cashier.name}>
              <td className="py-2.5 font-medium">{cashier.name}</td>
              <td className="py-2.5 pl-4 text-right tabular-nums">{cashier.orders}</td>
              <td className="py-2.5 pl-4 text-right font-semibold text-espresso-700 tabular-nums">
                {formatPrice(cashier.salesCents)}
              </td>
              {/* Voids stand out in red, the color for something gone wrong. */}
              <td
                className={`py-2.5 pl-4 text-right tabular-nums ${
                  cashier.voids > 0 ? "font-semibold text-red-800" : "text-roast-500"
                }`}
              >
                {cashier.voids}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function VoidsCard({ voids }: { voids: DaySummary["voids"] }) {
  const count = voids.orders.length;

  return (
    <Card
      title="Voids"
      aside={count > 0 ? `${plural(count, "order")} · ${formatPrice(voids.totalCents)}` : undefined}
    >
      {count === 0 ? (
        <p className="text-roast-500">No voids.</p>
      ) : (
        <ul className="divide-y divide-latte-200">
          {voids.orders.map((order) => (
            <li key={order.id} className="py-2.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-medium tabular-nums">
                  {formatCafeTime(order.createdAt)} · {order.cashierName}
                </span>
                {/* Crossed out, as on the Orders page: it isn't a sale. */}
                <span className="text-roast-500 tabular-nums line-through">
                  {formatPrice(order.totalCents)}
                </span>
              </div>
              {order.voided && (
                <p className="mt-0.5 text-sm text-roast-500 wrap-break-word">
                  {order.voided.reason} · by {order.voided.voidedByName} at{" "}
                  {formatCafeTime(order.voided.voidedAt)}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/** Shown for a day with no orders at all. */
export function SummaryEmpty({ isToday }: { isToday: boolean }) {
  return (
    <section className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-latte-100 text-espresso-700">
        <PiChartBar aria-hidden className="size-8" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-lg font-semibold">
          {isToday ? "No sales yet today" : "No sales on this day"}
        </p>
        <p className="max-w-sm text-roast-500">
          {isToday
            ? "The summary fills in as orders are paid."
            : "Pick another day to see its summary."}
        </p>
      </div>
    </section>
  );
}

/** Placeholder blocks while the summary loads. */
export function SummarySkeleton() {
  const block = "animate-pulse bg-latte-100 motion-reduce:animate-none";

  return (
    <div aria-busy="true" aria-label="Loading the summary" className="flex flex-col gap-6">
      <div className={`h-12 w-80 max-w-full rounded-2xl ${block}`} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[0, 1, 2, 3].map((tile) => (
          <div key={tile} className={`h-24 rounded-2xl ${block}`} />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className={`h-72 rounded-3xl ${block}`} />
        <div className={`h-72 rounded-3xl ${block}`} />
      </div>
    </div>
  );
}

// "1 order", "2 orders".
function plural(count: number, word: string): string {
  return `${count} ${count === 1 ? word : `${word}s`}`;
}
