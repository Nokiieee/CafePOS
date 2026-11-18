"use client";

import { useState } from "react";
import { PiArrowLeftBold, PiProhibitBold, PiReceipt } from "react-icons/pi";
import { cafeDayOf } from "@/lib/cafe-time";
import type { SavedOrder } from "@/lib/orders";
import { OrderList } from "./order-list";
import { OrderReceipt } from "./order-receipt";
import { VoidDialog } from "./void-dialog";

type OrdersViewProps = {
  orders: SavedOrder[];
  /** Today at the cafe. Only today's orders can be voided. */
  today: string;
  /** Admins can void (today's orders only). */
  isAdmin: boolean;
  /** Search results span several days, so the list gets day headings. */
  groupByDay?: boolean;
  /** What to say when there are no orders. */
  empty: { title: string; description: string };
};

// The list with the picked order's receipt beside it (md and up).
// On phones there's no room for both, so the receipt opens full-screen.
export function OrdersView({ orders, today, isAdmin, groupByDay = false, empty }: OrdersViewProps) {
  // The newest order is picked to begin with, so the receipt column isn't empty.
  const [selectedId, setSelectedId] = useState<string | null>(orders[0]?.id ?? null);
  const [isOpenOnPhone, setIsOpenOnPhone] = useState(false);
  // True while the Void popup is open for the picked order.
  const [isVoiding, setIsVoiding] = useState(false);
  const selected = orders.find((order) => order.id === selectedId) ?? orders[0];

  if (!selected) {
    return (
      <section className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-latte-100 text-espresso-700">
          <PiReceipt aria-hidden className="size-8" />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-lg font-semibold">{empty.title}</p>
          <p className="max-w-sm text-roast-500">{empty.description}</p>
        </div>
      </section>
    );
  }

  // The Void button: admins, an order not voided yet, paid today. Search
  // results can mix days, so this is checked for each order. The server and
  // the database check all of this again.
  const canVoid = isAdmin && !selected.voided && cafeDayOf(selected.createdAt) === today;

  return (
    <div className="grid items-start gap-6 md:grid-cols-[minmax(0,1fr)_20rem] lg:grid-cols-[minmax(0,1fr)_24rem]">
      <OrderList
        orders={orders}
        selectedId={selected.id}
        onSelect={(id) => {
          setSelectedId(id);
          setIsOpenOnPhone(true);
        }}
        groupByDay={groupByDay}
        today={today}
      />

      {/* md and up: a column that stays in view while the list scrolls.
          A very long receipt scrolls inside the column, so its end is reachable
          (-m-1 p-1 leaves room for focus rings, which scrolling would clip).
          Phones: hidden until a row is tapped, then it covers the screen.
          md:z-auto keeps the phone layer (z-20) from staying on at md and up
          after a row is tapped, where it put the column above the account menu. */}
      <aside
        aria-label="Order receipt"
        className={`[scrollbar-width:none] md:sticky md:top-0 md:z-auto md:block md:-m-1 md:max-h-[calc(100dvh-4rem)] md:overflow-y-auto md:p-1 ${
          isOpenOnPhone
            ? "fixed inset-0 z-20 block overflow-y-auto bg-milk px-4 pt-4 pb-8"
            : "hidden"
        }`}
      >
        <button
          type="button"
          onClick={() => setIsOpenOnPhone(false)}
          className="mb-4 flex h-11 items-center gap-2 rounded-xl px-3 font-medium text-espresso-800 transition-colors duration-200 outline-none hover:bg-latte-100 focus-visible:ring-2 focus-visible:ring-espresso-700 active:bg-latte-200 md:hidden"
        >
          <PiArrowLeftBold aria-hidden className="size-4" />
          Back to orders
        </button>
        <OrderReceipt order={selected} />

        {canVoid && (
          <button
            type="button"
            aria-haspopup="dialog"
            onClick={() => setIsVoiding(true)}
            className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white font-semibold text-red-800 ring-1 ring-latte-300 transition-[background-color,box-shadow] duration-200 outline-none hover:bg-red-50 hover:ring-red-200 focus-visible:ring-2 focus-visible:ring-espresso-700 active:bg-red-100"
          >
            <PiProhibitBold aria-hidden className="size-5" />
            Void order
          </button>
        )}
      </aside>

      {/* Outside the receipt column: on phones that column is hidden until a
          row is tapped, and a popup inside something hidden can't show. */}
      <VoidDialog order={isVoiding ? selected : null} onClose={() => setIsVoiding(false)} />
    </div>
  );
}
