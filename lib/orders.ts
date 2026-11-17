import type { OrderType } from "@/components/pos/bill";
import { cafeDayRange } from "@/lib/cafe-time";
import { createClient } from "@/lib/supabase/server";

// Reading saved orders back from Supabase. Server-only: it uses the
// per-request Supabase client, which reads the signed-in cashier's cookies.

/** One line of a saved order, as the app uses it. Money is in cents. */
export type SavedOrderLine = {
  lineNo: number;
  /** The menu item's id ("iced-latte"), the same for every size of a drink. */
  itemId: string;
  name: string;
  /** Drink options; all null for items without them. */
  size: string | null;
  sugar: number | null;
  ice: string | null;
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
};

/** Who voided an order, when and why (supabase/voids.sql). */
export type OrderVoid = {
  reason: string;
  voidedByName: string;
  /** The exact moment it was voided (ISO text, in UTC). */
  voidedAt: string;
};

/** A saved, paid order with its lines in bill order. Money is in cents. */
export type SavedOrder = {
  id: string;
  /** The exact moment it was paid (ISO text, in UTC). */
  createdAt: string;
  cashierName: string;
  orderType: OrderType;
  totalCents: number;
  cashReceivedCents: number;
  changeCents: number;
  lines: SavedOrderLine[];
  /** Set when the order was voided; null for a normal order. */
  voided: OrderVoid | null;
};

// The columns to read. "order_items(...)" fetches each order's lines in the
// same request, through the order_id link between the two tables.
// "order_voids(...)" works the same way. An order has at most one void
// (order_id is that table's primary key), so it comes back as one object, or
// null when the order wasn't voided, instead of a list.
const ORDER_COLUMNS = `
  id, created_at, cashier_name, order_type,
  total_cents, cash_received_cents, change_cents,
  order_items ( line_no, item_id, name, size, sugar, ice, unit_price_cents, quantity, line_total_cents ),
  order_voids ( reason, voided_by_name, voided_at )
`;

/** The shape Supabase sends back for ORDER_COLUMNS (database names, snake_case). */
type OrderRow = {
  id: string;
  created_at: string;
  cashier_name: string;
  order_type: OrderType;
  total_cents: number;
  cash_received_cents: number;
  change_cents: number;
  order_items: {
    line_no: number;
    item_id: string;
    name: string;
    size: string | null;
    sugar: number | null;
    ice: string | null;
    unit_price_cents: number;
    quantity: number;
    line_total_cents: number;
  }[];
  order_voids: {
    reason: string;
    voided_by_name: string;
    voided_at: string;
  } | null;
};

/**
 * Every order paid on one cafe day ("2026-11-13"), newest first.
 * Returns null if Supabase couldn't be reached or refused.
 */
export async function getOrdersForDay(day: string): Promise<SavedOrder[] | null> {
  const { start, end } = cafeDayRange(day);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_COLUMNS)
    .gte("created_at", start)
    .lt("created_at", end)
    .order("created_at", { ascending: false })
    // Each order's lines in bill order: 1, 2, 3...
    .order("line_no", { referencedTable: "order_items", ascending: true })
    // Supabase doesn't know our tables' types, so tell it what comes back.
    .overrideTypes<OrderRow[], { merge: false }>();

  if (error) {
    console.error("Loading orders failed:", error.message);
    return null;
  }

  return data.map(toSavedOrder);
}

// Database names (snake_case) to the app's names (camelCase).
function toSavedOrder(row: OrderRow): SavedOrder {
  return {
    id: row.id,
    createdAt: row.created_at,
    cashierName: row.cashier_name,
    orderType: row.order_type,
    totalCents: row.total_cents,
    cashReceivedCents: row.cash_received_cents,
    changeCents: row.change_cents,
    lines: row.order_items.map((item) => ({
      lineNo: item.line_no,
      itemId: item.item_id,
      name: item.name,
      size: item.size,
      sugar: item.sugar,
      ice: item.ice,
      unitPriceCents: item.unit_price_cents,
      quantity: item.quantity,
      lineTotalCents: item.line_total_cents,
    })),
    voided: row.order_voids
      ? {
          reason: row.order_voids.reason,
          voidedByName: row.order_voids.voided_by_name,
          voidedAt: row.order_voids.voided_at,
        }
      : null,
  };
}
