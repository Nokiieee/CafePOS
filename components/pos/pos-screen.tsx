"use client";

import { Suspense, use, useState, type ReactNode } from "react";
import { saveOrder, type SaveOrderResult } from "@/actions/orders";
import type { MenuItem } from "@/lib/menu";
import { createOrderId } from "./bill";
import { BillPanel } from "./bill-panel";
import { categories, type Category } from "./categories";
import { CategoryNav } from "./category-nav";
import { ChargeDialog } from "./charge-dialog";
import { ItemDialog } from "./item-dialog";
import { MenuGrid, MenuGridSkeleton } from "./menu-grid";
import { useCurrentBill } from "./bill-provider";

/** The menu from Supabase, or null when it couldn't be loaded. */
type MenuPromise = Promise<MenuItem[] | null>;

type PosScreenProps = {
  /** Shown at the top right, e.g. who is signed in. Rendered on the server. */
  account: ReactNode;
  /**
   * The menu, still loading when the screen first draws (started in
   * app/dashboard/page.tsx). Only the parts that need it wait for it, inside
   * <Suspense>; the rail, the header and the bill show right away.
   */
  menu: MenuPromise;
};

export function PosScreen({ account, menu }: PosScreenProps) {
  const [selectedId, setSelectedId] = useState(categories[0].id);
  // The item whose options popup is open, or null when it's closed.
  const [openItem, setOpenItem] = useState<MenuItem | null>(null);
  // The id of the order being paid for. Made when Charge is tapped, and null
  // while the payment popup is closed.
  const [chargeOrderId, setChargeOrderId] = useState<string | null>(null);
  // The bill lives in app/dashboard/layout.tsx, so it survives a trip to Orders.
  const bill = useCurrentBill();

  // Saves the bill as a paid order. The item, options and quantity of each
  // line are sent; the server looks up names and prices itself. The price
  // shown is sent only so the server can tell if it changed meanwhile.
  function saveBill(orderId: string, cashReceivedCents: number): Promise<SaveOrderResult> {
    return saveOrder({
      orderId,
      orderType: bill.orderType,
      cashReceivedCents,
      lines: bill.lines.map(({ itemId, options, quantity, unitPrice }) => ({
        itemId,
        options,
        quantity,
        unitPriceCents: unitPrice,
      })),
    });
  }
  const selected =
    categories.find((category) => category.id === selectedId) ?? categories[0];

  return (
    <div className="flex h-dvh bg-milk text-espresso-950">
      <CategoryNav selectedId={selected.id} onSelect={setSelectedId} />

      <main className="flex min-w-0 flex-1 flex-col gap-6 overflow-y-auto px-6 pt-8 pb-24 [scrollbar-color:var(--color-latte-300)_transparent] sm:px-10 md:pb-8">
        <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <div className="flex items-baseline gap-3">
            <h1 className="text-3xl font-semibold tracking-tight">
              {selected.id === "all" ? "All items" : selected.label}
            </h1>
            {/* Nothing beside the title until the menu arrives. */}
            <Suspense fallback={null}>
              <ItemCount menu={menu} categoryId={selected.id} />
            </Suspense>
          </div>
          <div className="min-w-0 max-w-full">{account}</div>
        </header>

        <Suspense fallback={<MenuGridSkeleton />}>
          <MenuItems menu={menu} category={selected} onSelect={setOpenItem} />
        </Suspense>
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

// "All" shows everything; any other category shows only its own items.
function itemsIn(items: MenuItem[], categoryId: string): MenuItem[] {
  return categoryId === "all" ? items : items.filter((item) => item.categoryId === categoryId);
}

type ItemCountProps = {
  menu: MenuPromise;
  categoryId: string;
};

// "9 items", beside the title. use() waits for the menu (the <Suspense>
// around this shows nothing meanwhile), then gives what it loaded.
function ItemCount({ menu, categoryId }: ItemCountProps) {
  const items = use(menu);
  if (!items) return null;

  const count = itemsIn(items, categoryId).length;
  return (
    <span className="text-roast-500">
      {count} {count === 1 ? "item" : "items"}
    </span>
  );
}

type MenuItemsProps = {
  menu: MenuPromise;
  category: Category;
  onSelect: (item: MenuItem) => void;
};

// The picked category's items, once the menu has loaded (until then, the
// <Suspense> around this shows placeholder cards).
function MenuItems({ menu, category, onSelect }: MenuItemsProps) {
  const items = use(menu);

  if (!items) {
    return (
      <p role="alert" className="rounded-2xl bg-latte-100 px-5 py-4 font-medium text-espresso-900">
        {"The menu couldn't be loaded. Check the internet connection and refresh the page."}
      </p>
    );
  }

  const visibleItems = itemsIn(items, category.id);
  if (visibleItems.length > 0) {
    return <MenuGrid items={visibleItems} onSelect={onSelect} />;
  }

  const Icon = category.icon;
  return (
    <section className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-latte-100 text-espresso-700">
        <Icon aria-hidden className="size-8" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-lg font-semibold">
          {category.id === "all" ? "No menu items yet" : `Nothing in ${category.label} yet`}
        </p>
        <p className="max-w-sm text-roast-500">
          Items added to the menu will appear here, ready to tap into an order.
        </p>
      </div>
    </section>
  );
}
