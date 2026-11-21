"use server";

import { refresh } from "next/cache";
import { orderTypes, type DrinkOptions, type OrderType } from "@/components/pos/bill";
import {
  hasDrinkOptions,
  iceLevels,
  MAX_QUANTITY,
  sizes,
  sugarLevels,
  unitPrice,
} from "@/components/pos/item-options";
import { getCurrentUser, getDisplayName } from "@/lib/auth";
import { getMenuItemsByIds, type MenuItem } from "@/lib/menu";
import { createClient } from "@/lib/supabase/server";

/** What the payment popup sends when the cashier taps Confirm. */
export type SaveOrderInput = {
  /** Made once per payment, so sending it twice can't save two orders. */
  orderId: string;
  orderType: OrderType;
  cashReceivedCents: number;
  /** The bill's lines, top to bottom. No names: those come from the menu here. */
  lines: {
    itemId: string;
    options: DrinkOptions | null;
    quantity: number;
    /**
     * The price of one, as the bill shows it. Only compared with the menu, to
     * catch a price that changed while the bill was open. The price saved
     * always comes from the menu.
     */
    unitPriceCents: number;
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

const CONNECTION_PROBLEM = "The order couldn't be saved. Check the internet connection and try again.";

// Saves a paid bill to Supabase.
//
// Anything sent from the browser can be changed by whoever is using it, so
// nothing here is trusted: every value is checked, and names and prices are
// looked up again in the menu instead of taken from the bill.
export async function saveOrder(input: SaveOrderInput): Promise<SaveOrderResult> {
  // Signed-out callers are sent to the login page.
  const user = await getCurrentUser();

  const lines = input?.lines;
  if (
    typeof input?.orderId !== "string" ||
    !UUID.test(input.orderId) ||
    !orderTypes.some((type) => type.value === input.orderType) ||
    !Array.isArray(lines) ||
    lines.length === 0 ||
    lines.length > MAX_LINES
  ) {
    return { ok: false, message: "Something went wrong with this bill. Please try again." };
  }

  // The bill's items as the menu has them now, in the database.
  const ids = lines.map((line) => line?.itemId).filter((id) => typeof id === "string");
  const menuItems = await getMenuItemsByIds([...new Set(ids)]);
  if (!menuItems) {
    return { ok: false, message: CONNECTION_PROBLEM };
  }

  const checked = toOrderItems(lines, menuItems);
  if (!checked.ok) {
    // The menu changed while this bill was open. Refreshing redraws the
    // Register with the menu as it is now (the bill itself is kept).
    if (checked.menuChanged) refresh();
    return { ok: false, message: checked.message };
  }
  const items = checked.rows;

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
    return { ok: false, message: CONNECTION_PROBLEM };
  }

  return { ok: true };
}

/** The bill's lines as order_items rows, or why they can't be saved. */
type CheckedLines =
  | { ok: true; rows: OrderItemRow[] }
  | {
      ok: false;
      message: string;
      /** True when the menu changed while the bill was open (not a broken request). */
      menuChanged: boolean;
    };

// Turns the bill's lines into order_items rows, with names and prices from
// the menu (the bill's items, as getMenuItemsByIds loaded them).
function toOrderItems(lines: SaveOrderInput["lines"], menuItems: MenuItem[]): CheckedLines {
  // A line the real Register can't make: an unknown item, a broken quantity
  // or options. Something went wrong (or someone sent their own request).
  const broken: CheckedLines = {
    ok: false,
    message: "Something on this bill isn't on the menu anymore. Clear the bill and add the items again.",
    menuChanged: false,
  };

  const rows: OrderItemRow[] = [];

  for (const line of lines) {
    const item = menuItems.find((menuItem) => menuItem.id === line?.itemId);
    if (!item) return broken;

    // An admin took it off the menu while this bill was open.
    if (!item.isOnMenu) {
      return {
        ok: false,
        message: `${item.name} was taken off the menu. Remove it from the bill to continue.`,
        menuChanged: true,
      };
    }

    const quantity = line.quantity;
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
      return broken;
    }

    // Drinks must have a real size, sugar level and ice level. Everything
    // else has no options, at the menu price.
    let options: DrinkOptions | null = null;
    if (hasDrinkOptions(item)) {
      if (!isDrinkOptions(line.options)) return broken;
      options = line.options;
    } else if (line.options != null) {
      return broken;
    }
    const price = options ? unitPrice(item, options.size) : item.price;

    // An admin changed the price while this bill was open. The customer was
    // asked for the old price, so the new one isn't saved without a word:
    // the cashier adds the item again, at the new price, and charges again.
    if (line.unitPriceCents !== price) {
      return {
        ok: false,
        message: `The price of ${item.name} changed. Remove it from the bill and add it again.`,
        menuChanged: true,
      };
    }

    rows.push({
      item_id: item.id,
      name: item.name,
      size: options?.size ?? null,
      sugar: options?.sugar ?? null,
      ice: options?.ice ?? null,
      unit_price_cents: price,
      quantity,
    });
  }

  return { ok: true, rows };
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
