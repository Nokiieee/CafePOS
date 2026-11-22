import type { ReactNode } from "react";
import { PiChartBar } from "react-icons/pi";
import { cafeDayOf, formatCafeDayShort, formatCafeTime } from "@/lib/cafe-time";
import { formatPrice } from "@/lib/format-price";
import type { OrdersSummary } from "@/lib/summary";
import { ShowAll } from "./show-all";

type SummaryViewProps = {
  summary: OrdersSummary;
  /** A range of days: voids show their date as well as the time. */
  showDates?: boolean;
  /** The day or dates in words, for the Show all popups: "Nov 16 – Nov 22". */
  datesLabel: string;
};

// The summary's sections, for one day or a range: the four headline numbers,
// then what sold on the left and the breakdowns on the right (one column on
// phones). It's drawn on the server; only the Show all buttons and their
// popups (show-all.tsx) run in the browser.
export function SummaryView({ summary, showDates = false, datesLabel }: SummaryViewProps) {
  return (
    <div className="flex flex-col gap-6">
      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Sales" value={formatPrice(summary.salesCents)} isMain />
        <Stat label="Orders" value={summary.orderCount} />
        <Stat label="Average order" value={formatPrice(summary.averageCents)} />
        <Stat label="Items sold" value={summary.itemsSold} />
      </dl>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <ItemsCard items={summary.items} datesLabel={datesLabel} />
        <div className="flex flex-col gap-6">
          <OrderTypesCard orderTypes={summary.orderTypes} />
          <CashiersCard cashiers={summary.cashiers} />
          <VoidsCard voids={summary.voids} showDates={showDates} datesLabel={datesLabel} />
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

// How many rows the Items sold and Voids cards show before "Show all", so
// a week or a month doesn't make the page very long (the user's choice).
const ITEMS_SHOWN = 8;
const VOIDS_SHOWN = 5;

type ItemsCardProps = {
  /** Most sold first. */
  items: OrdersSummary["items"];
  datesLabel: string;
};

// The best sellers, then Show all for the rest, in a popup.
function ItemsCard({ items, datesLabel }: ItemsCardProps) {
  const hasMore = items.length > ITEMS_SHOWN;

  return (
    <Card title="Items sold" aside={hasMore ? `Top ${ITEMS_SHOWN} of ${items.length}` : undefined}>
      {items.length === 0 ? (
        <p className="text-roast-500">Nothing sold.</p>
      ) : (
        <>
          <ItemsTable items={items.slice(0, ITEMS_SHOWN)} />
          {hasMore && (
            <ShowAll
              label={`Show all ${items.length} items`}
              title="Items sold"
              subtitle={`${datesLabel} · ${plural(items.length, "item")}`}
            >
              <ItemsTable items={items} hasStickyHead />
            </ShowAll>
          )}
        </>
      )}
    </Card>
  );
}

type ItemsTableProps = {
  items: OrdersSummary["items"];
  /** In the popup, the column titles stay at the top while the list scrolls. */
  hasStickyHead?: boolean;
};

function ItemsTable({ items, hasStickyHead = false }: ItemsTableProps) {
  // White behind the titles, so rows scrolling under them don't show
  // through, and a line under them, drawn as a shadow (borders on sticky
  // table cells don't stay put).
  const head = hasStickyHead
    ? "sticky top-0 z-10 bg-white shadow-[inset_0_-1px_0_var(--color-latte-200)]"
    : "";

  return (
    <table className="w-full text-left">
      <thead>
        <tr className="text-sm text-roast-500">
          <th className={`pb-2 font-medium ${head}`}>Item</th>
          <th className={`pb-2 pl-4 text-right font-medium ${head}`}>Sold</th>
          <th className={`pb-2 pl-4 text-right font-medium ${head}`}>Sales</th>
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
  );
}

function OrderTypesCard({ orderTypes }: { orderTypes: OrdersSummary["orderTypes"] }) {
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

function CashiersCard({ cashiers }: { cashiers: OrdersSummary["cashiers"] }) {
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

type VoidsCardProps = {
  /** Newest first. */
  voids: OrdersSummary["voids"];
  /** A range of days: each void shows its date as well as the time. */
  showDates: boolean;
  datesLabel: string;
};

// The newest voids, then Show all for the rest, in a popup.
function VoidsCard({ voids, showDates, datesLabel }: VoidsCardProps) {
  const count = voids.orders.length;
  const total = `${plural(count, "order")} · ${formatPrice(voids.totalCents)}`;

  return (
    <Card title="Voids" aside={count > 0 ? total : undefined}>
      {count === 0 ? (
        <p className="text-roast-500">No voids.</p>
      ) : (
        <>
          <VoidsList orders={voids.orders.slice(0, VOIDS_SHOWN)} showDates={showDates} />
          {count > VOIDS_SHOWN && (
            <ShowAll
              label={`Show all ${count} voids`}
              title="Voids"
              subtitle={`${datesLabel} · ${total}`}
            >
              <VoidsList orders={voids.orders} showDates={showDates} />
            </ShowAll>
          )}
        </>
      )}
    </Card>
  );
}

type VoidsListProps = {
  orders: OrdersSummary["voids"]["orders"];
  showDates: boolean;
};

function VoidsList({ orders, showDates }: VoidsListProps) {
  return (
    <ul className="divide-y divide-latte-200">
      {orders.map((order) => (
        <li key={order.id} className="py-2.5">
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-medium tabular-nums">
              {/* "Nov 15, 2:13 PM" in a range; just the time for one day. */}
              {showDates && `${formatCafeDayShort(cafeDayOf(order.createdAt))}, `}
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
  );
}

type SummaryEmptyProps = {
  /** What's shown: today, another single day, or a range of days. */
  shown: "today" | "day" | "range";
};

/** Shown when there are no orders at all for the day or the dates. */
export function SummaryEmpty({ shown }: SummaryEmptyProps) {
  const text = {
    today: { title: "No sales yet today", description: "The summary fills in as orders are paid." },
    day: { title: "No sales on this day", description: "Pick another day to see its summary." },
    range: { title: "No sales in these dates", description: "Pick other dates to see their summary." },
  }[shown];

  return (
    <section className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-latte-100 text-espresso-700">
        <PiChartBar aria-hidden className="size-8" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-lg font-semibold">{text.title}</p>
        <p className="max-w-sm text-roast-500">{text.description}</p>
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
