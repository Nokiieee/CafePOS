import type { OrderType } from "@/components/pos/bill";
import { cafeDayRange } from "@/lib/cafe-time";
import { createClient } from "@/lib/supabase/server";

// Reading saved orders back from Supabase. Server-only: it uses the
// per-request Supabase client, which reads the signed-in cashier's cookies.

/** One line of a saved order, as the app uses it. Money is in cents. */
export type SavedOrderLine = {
  lineNo: number;
  name: string;
  /** Drink options; all null for items without them. */
  size: string | null;
  sugar: number | null;
  ice: string | null;
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
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
};

// The columns to read. "order_items(...)" fetches each order's lines in the
// same request, through the order_id link between the two tables.
const ORDER_COLUMNS = `
  id, created_at, cashier_name, order_type,
  total_cents, cash_received_cents, change_cents,
  order_items ( line_no, name, size, sugar, ice, unit_price_cents, quantity, line_total_cents )
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
    name: string;
    size: string | null;
    sugar: number | null;
    ice: string | null;
    unit_price_cents: number;
    quantity: number;
    line_total_cents: number;
  }[];
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
      name: item.name,
      size: item.size,
      sugar: item.sugar,
      ice: item.ice,
      unitPriceCents: item.unit_price_cents,
      quantity: item.quantity,
      lineTotalCents: item.line_total_cents,
    })),
  };
}
