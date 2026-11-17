import { orderTypes, type OrderType } from "@/components/pos/bill";
import type { SavedOrder } from "@/lib/orders";

// The end-of-day summary, worked out from one day's orders (as loaded by
// getOrdersForDay). It only adds things up: no database, no screen.
//
// Voided orders aren't sales. They're left out of every number except the
// Voids section, where they're counted on their own.
// Money stays in cents, like everywhere else in the app.

/** One menu item's sales for the day. All sizes of a drink are counted together. */
export type ItemSales = {
  itemId: string;
  name: string;
  quantity: number;
  salesCents: number;
};

/** Dine In or Take Out. */
export type OrderTypeSales = {
  orderType: OrderType;
  label: string;
  orders: number;
  salesCents: number;
};

/** One cashier's day. Their voids are orders they charged that were voided later. */
export type CashierSales = {
  name: string;
  orders: number;
  salesCents: number;
  voids: number;
};

export type DaySummary = {
  salesCents: number;
  /** Orders that count as sales (not voided). */
  orderCount: number;
  /** Sales ÷ orders, rounded to the cent. 0 when there are no orders. */
  averageCents: number;
  /** How many things were sold, adding up every line's quantity. */
  itemsSold: number;
  /** Most sold first. */
  items: ItemSales[];
  /** Dine In, then Take Out, always both. */
  orderTypes: OrderTypeSales[];
  /** Most sales first. */
  cashiers: CashierSales[];
  /** The voided orders, newest first, and their total. */
  voids: { orders: SavedOrder[]; totalCents: number };
};

export function summarizeDay(orders: SavedOrder[]): DaySummary {
  const sold = orders.filter((order) => !order.voided);
  const voided = orders.filter((order) => order.voided);

  const salesCents = sum(sold.map((order) => order.totalCents));
  const orderCount = sold.length;

  return {
    salesCents,
    orderCount,
    averageCents: orderCount > 0 ? Math.round(salesCents / orderCount) : 0,
    itemsSold: sum(sold.flatMap((order) => order.lines.map((line) => line.quantity))),
    items: itemSales(sold),
    orderTypes: orderTypes.map(({ value, label }) => {
      const ofType = sold.filter((order) => order.orderType === value);
      return {
        orderType: value,
        label,
        orders: ofType.length,
        salesCents: sum(ofType.map((order) => order.totalCents)),
      };
    }),
    cashiers: cashierSales(orders),
    voids: { orders: voided, totalCents: sum(voided.map((order) => order.totalCents)) },
  };
}

// Adds up every line by menu item, so Small, Medium and Large of a drink
// land on one row.
function itemSales(orders: SavedOrder[]): ItemSales[] {
  const byItem = new Map<string, ItemSales>();

  for (const order of orders) {
    for (const line of order.lines) {
      const item = byItem.get(line.itemId);
      if (item) {
        item.quantity += line.quantity;
        item.salesCents += line.lineTotalCents;
      } else {
        // Orders come newest first, so the first name seen is the newest one,
        // in case the item was renamed during the day.
        byItem.set(line.itemId, {
          itemId: line.itemId,
          name: line.name,
          quantity: line.quantity,
          salesCents: line.lineTotalCents,
        });
      }
    }
  }

  // Most sold first; on a tie, more money first, then A to Z.
  return [...byItem.values()].sort(
    (a, b) => b.quantity - a.quantity || b.salesCents - a.salesCents || a.name.localeCompare(b.name),
  );
}

// Each cashier's orders and sales (voided orders left out), and how many of
// their orders were voided. Includes all orders, so a cashier whose only order
// was voided still shows up.
function cashierSales(orders: SavedOrder[]): CashierSales[] {
  const byCashier = new Map<string, CashierSales>();

  for (const order of orders) {
    let cashier = byCashier.get(order.cashierName);
    if (!cashier) {
      cashier = { name: order.cashierName, orders: 0, salesCents: 0, voids: 0 };
      byCashier.set(order.cashierName, cashier);
    }

    if (order.voided) {
      cashier.voids += 1;
    } else {
      cashier.orders += 1;
      cashier.salesCents += order.totalCents;
    }
  }

  // Most sales first, then A to Z.
  return [...byCashier.values()].sort(
    (a, b) => b.salesCents - a.salesCents || a.name.localeCompare(b.name),
  );
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}
