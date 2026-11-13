"use client";

import { useState, type ReactNode } from "react";
import { saveOrder, type SaveOrderResult } from "@/actions/orders";
import { createOrderId } from "./bill";
import { BillPanel } from "./bill-panel";
import { categories } from "./categories";
import { CategoryNav } from "./category-nav";
import { ChargeDialog } from "./charge-dialog";
import { ItemDialog } from "./item-dialog";
import { MenuGrid } from "./menu-grid";
import { menuItems, type MenuItem } from "./menu-items";
import { useCurrentBill } from "./bill-provider";

type PosScreenProps = {
  /** Shown at the top right, e.g. who is signed in. Rendered on the server. */
  account: ReactNode;
};

export function PosScreen({ account }: PosScreenProps) {
  const [selectedId, setSelectedId] = useState(categories[0].id);
  // The item whose options popup is open, or null when it's closed.
  const [openItem, setOpenItem] = useState<MenuItem | null>(null);
  // The id of the order being paid for. Made when Charge is tapped, and null
  // while the payment popup is closed.
  const [chargeOrderId, setChargeOrderId] = useState<string | null>(null);
  // The bill lives in app/dashboard/layout.tsx, so it survives a trip to Orders.
  const bill = useCurrentBill();

  // Saves the bill as a paid order. Only the item, options and quantity of
  // each line are sent; the server looks up names and prices itself.
  function saveBill(orderId: string, cashReceivedCents: number): Promise<SaveOrderResult> {
    return saveOrder({
      orderId,
      orderType: bill.orderType,
      cashReceivedCents,
      lines: bill.lines.map(({ itemId, options, quantity }) => ({ itemId, options, quantity })),
    });
  }
  const selected =
    categories.find((category) => category.id === selectedId) ?? categories[0];
  const Icon = selected.icon;

  // "All" shows everything; any other category shows only its own items.
  const visibleItems =
    selected.id === "all"
      ? menuItems
      : menuItems.filter((item) => item.categoryId === selected.id);

  return (
    <div className="flex h-dvh bg-milk text-espresso-950">
      <CategoryNav selectedId={selected.id} onSelect={setSelectedId} />

      <main className="flex min-w-0 flex-1 flex-col gap-6 overflow-y-auto px-6 pt-8 pb-24 [scrollbar-color:var(--color-latte-300)_transparent] sm:px-10 md:pb-8">
        <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <div className="flex items-baseline gap-3">
            <h1 className="text-3xl font-semibold tracking-tight">
              {selected.id === "all" ? "All items" : selected.label}
            </h1>
            <span className="text-roast-500">
              {visibleItems.length}{" "}
              {visibleItems.length === 1 ? "item" : "items"}
            </span>
          </div>
          <div className="min-w-0 max-w-full">{account}</div>
        </header>

        {visibleItems.length > 0 ? (
          <MenuGrid items={visibleItems} onSelect={setOpenItem} />
        ) : (
          <section className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-latte-100 text-espresso-700">
              <Icon aria-hidden className="size-8" />
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-lg font-semibold">
                {selected.id === "all"
                  ? "No menu items yet"
                  : `Nothing in ${selected.label} yet`}
              </p>
              <p className="max-w-sm text-roast-500">
                Items added to the menu will appear here, ready to tap into an
                order.
              </p>
            </div>
          </section>
        )}
      </main>

      {/* The id is made here, in a tap, not while drawing: React can draw
          more than once, and a random value would change each time. */}
      <BillPanel bill={bill} onCharge={() => setChargeOrderId(createOrderId())} />

      <ItemDialog item={openItem} onClose={() => setOpenItem(null)} onAdd={bill.add} />

      <ChargeDialog
        orderId={chargeOrderId}
        total={bill.total}
        orderType={bill.orderType}
        onOrderTypeChange={bill.setOrderType}
        onClose={() => setChargeOrderId(null)}
        onPay={saveBill}
        onPaid={bill.clear}
      />
    </div>
  );
}
