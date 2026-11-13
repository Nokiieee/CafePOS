"use server";

import { orderTypes, type DrinkOptions, type OrderType } from "@/components/pos/bill";
import {
  hasDrinkOptions,
  iceLevels,
  MAX_QUANTITY,
  sizes,
  sugarLevels,
  unitPrice,
} from "@/components/pos/item-options";
import { menuItems } from "@/components/pos/menu-items";
import { getCurrentUser, getDisplayName } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/** What the payment popup sends when the cashier taps Confirm. */
export type SaveOrderInput = {
  /** Made once per payment, so sending it twice can't save two orders. */
  orderId: string;
  orderType: OrderType;
  cashReceivedCents: number;
  /** The bill's lines, top to bottom. No names or prices: those come from the menu here. */
  lines: {
    itemId: string;
    options: DrinkOptions | null;
    quantity: number;
  }[];
};

/** Saved, or a message to show the cashier. */
export type SaveOrderResult = { ok: true } | { ok: false; message: string };

/** One row for order_items, in the shape create_order expects (see supabase/schema.sql). */
type OrderItemRow = {
  item_id: string;
  name: string;
  size: string | null;
  sugar: number | null;
  ice: string | null;
  unit_price_cents: number;
  quantity: number;
};

// No real cafe bill has this many lines. It stops absurdly large requests.
const MAX_LINES = 100;
// The most the number pad allows: $99,999.99.
const MAX_CASH_CENTS = 9_999_999;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Saves a paid bill to Supabase.
//
// Anything sent from the browser can be changed by whoever is using it, so
// nothing here is trusted: every value is checked, and names and prices are
// looked up again in the menu instead of taken from the bill.
export async function saveOrder(input: SaveOrderInput): Promise<SaveOrderResult> {
  // Signed-out callers are sent to the login page.
  const user = await getCurrentUser();

  if (
    typeof input?.orderId !== "string" ||
    !UUID.test(input.orderId) ||
    !orderTypes.some((type) => type.value === input.orderType)
  ) {
    return { ok: false, message: "Something went wrong with this bill. Please try again." };
  }

  const items = toOrderItems(input.lines);
  if (!items) {
    return {
      ok: false,
      message: "Something on this bill isn't on the menu anymore. Clear the bill and add the items again.",
    };
  }

  const total = items.reduce((sum, item) => sum + item.unit_price_cents * item.quantity, 0);
  const cash = input.cashReceivedCents;
  if (!Number.isInteger(cash) || cash < total || cash > MAX_CASH_CENTS) {
    return { ok: false, message: "The cash received doesn't cover the total." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_order", {
    p_order_id: input.orderId,
    p_cashier_name: getDisplayName(user),
    p_order_type: input.orderType,
    p_cash_received_cents: cash,
    p_items: items,
  });

  if (error) {
    // The details go to the server log; the cashier gets a plain message.
    console.error("create_order failed:", error.message);
    return {
      ok: false,
      message: "The order couldn't be saved. Check the internet connection and try again.",
    };
  }

  return { ok: true };
}

// Turns the bill's lines into order_items rows, with names and prices from
// the menu. Returns null if any line doesn't match the menu.
function toOrderItems(lines: SaveOrderInput["lines"]): OrderItemRow[] | null {
  if (!Array.isArray(lines) || lines.length === 0 || lines.length > MAX_LINES) {
    return null;
  }

  const rows: OrderItemRow[] = [];

  for (const line of lines) {
    const item = menuItems.find((menuItem) => menuItem.id === line?.itemId);
    if (!item) return null;

    const quantity = line.quantity;
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
      return null;
    }

    if (hasDrinkOptions(item)) {
      // Drinks must have a real size, sugar level and ice level.
      const options = line.options;
      if (!isDrinkOptions(options)) return null;

      rows.push({
        item_id: item.id,
        name: item.name,
        size: options.size,
        sugar: options.sugar,
        ice: options.ice,
        unit_price_cents: unitPrice(item, options.size),
        quantity,
      });
    } else {
      // Everything else has no options, at the menu price.
      if (line.options != null) return null;

      rows.push({
        item_id: item.id,
        name: item.name,
        size: null,
        sugar: null,
        ice: null,
        unit_price_cents: item.price,
        quantity,
      });
    }
  }

  return rows;
}

// True only for a size, sugar and ice level that the item popup offers.
function isDrinkOptions(options: DrinkOptions | null): options is DrinkOptions {
  return (
    options != null &&
    sizes.some((size) => size.id === options.size) &&
    sugarLevels.some((level) => level === options.sugar) &&
    iceLevels.some((level) => level === options.ice)
  );
}
