"use client";

import { useState } from "react";
import { PiArrowLeftBold, PiReceipt } from "react-icons/pi";
import type { SavedOrder } from "@/lib/orders";
import { OrderList } from "./order-list";
import { OrderReceipt } from "./order-receipt";

type OrdersViewProps = {
  orders: SavedOrder[];
  isToday: boolean;
};

// The day's list with the picked order's receipt beside it (md and up).
// On phones there's no room for both, so the receipt opens full-screen.
export function OrdersView({ orders, isToday }: OrdersViewProps) {
  // The newest order is picked to begin with, so the receipt column isn't empty.
  const [selectedId, setSelectedId] = useState<string | null>(orders[0]?.id ?? null);
  const [isOpenOnPhone, setIsOpenOnPhone] = useState(false);
  const selected = orders.find((order) => order.id === selectedId) ?? orders[0];

  if (!selected) {
    return (
      <section className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-latte-100 text-espresso-700">
          <PiReceipt aria-hidden className="size-8" />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-lg font-semibold">
            {isToday ? "No orders yet today" : "No orders on this day"}
          </p>
          <p className="max-w-sm text-roast-500">Every paid bill shows up here, newest first.</p>
        </div>
      </section>
    );
  }

  return (
    <div className="grid items-start gap-6 md:grid-cols-[minmax(0,1fr)_20rem] lg:grid-cols-[minmax(0,1fr)_24rem]">
      <OrderList
        orders={orders}
        selectedId={selected.id}
        onSelect={(id) => {
          setSelectedId(id);
          setIsOpenOnPhone(true);
        }}
      />

      {/* md and up: a column that stays in view while the list scrolls.
          A very long receipt scrolls inside the column, so its end is reachable
          (-m-1 p-1 leaves room for focus rings, which scrolling would clip).
          Phones: hidden until a row is tapped, then it covers the screen. */}
      <aside
        aria-label="Order receipt"
        className={`[scrollbar-width:none] md:sticky md:top-0 md:block md:-m-1 md:max-h-[calc(100dvh-4rem)] md:overflow-y-auto md:p-1 ${
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
      </aside>
    </div>
  );
}
