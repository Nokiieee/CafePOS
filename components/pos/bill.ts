import {
  hasDrinkOptions,
  sizes,
  unitPrice,
  type IceLevel,
  type SizeId,
  type SugarLevel,
} from "./item-options";
import type { MenuItem } from "./menu-items";

export type OrderType = "dine-in" | "take-out";

export const orderTypes: { value: OrderType; label: string }[] = [
  { value: "dine-in", label: "Dine In" },
  { value: "take-out", label: "Take Out" },
];

/** What the cashier picked in the item popup. */
export type ItemChoice = {
  item: MenuItem;
  size: SizeId;
  sugar: SugarLevel;
  ice: IceLevel;
  quantity: number;
};

export type DrinkOptions = {
  size: SizeId;
  sugar: SugarLevel;
  ice: IceLevel;
};

/** One row on the bill. */
export type BillLine = {
  /** The same item with the same options has the same key, so they share a row. */
  key: string;
  /** The menu item's id, like "iced-latte". Saving the order sends this. */
  itemId: string;
  name: string;
  /** null for sides and pasta, which have no drink options. */
  options: DrinkOptions | null;
  /** The price of one, in cents. */
  unitPrice: number;
  quantity: number;
};

export function createLine({ item, size, sugar, ice, quantity }: ItemChoice): BillLine {
  const isDrink = hasDrinkOptions(item);

  return {
    key: isDrink ? `${item.id}|${size}|${ice}|${sugar}` : item.id,
    itemId: item.id,
    name: item.name,
    options: isDrink ? { size, sugar, ice } : null,
    unitPrice: unitPrice(item, size),
    quantity,
  };
}

// The options in words: "Large · Less ice · 50% sugar". \u00A0 is a
// non-breaking space, so a narrow row can only wrap before the sugar part,
// and never leaves the word "sugar" alone on a line.
export function describeOptions({ size, sugar, ice }: DrinkOptions): string {
  const sizeLabel = sizes.find((s) => s.id === size)?.label ?? "";
  return `${sizeLabel}\u00A0·\u00A0${ice}\u00A0ice · ${sugar}%\u00A0sugar`;
}

export function lineTotal(line: BillLine): number {
  return line.unitPrice * line.quantity;
}

export function billTotal(lines: BillLine[]): number {
  return lines.reduce((total, line) => total + lineTotal(line), 0);
}

export function billItemCount(lines: BillLine[]): number {
  return lines.reduce((count, line) => count + line.quantity, 0);
}

// Letters and numbers that are hard to mix up: no 0/O, 1/I/L.
const ID_CHARACTERS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

// A short ID like "1106-K7QF": the month and day, then 4 random characters.
// This is temporary. A true running number (#1, #2, #3) needs orders saved in
// the database, so it can replace this when orders are stored in Supabase.
export function createBillId(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  const random = crypto.getRandomValues(new Uint32Array(4));
  const code = Array.from(
    random,
    (value) => ID_CHARACTERS[value % ID_CHARACTERS.length],
  ).join("");

  return `${month}${day}-${code}`;
}

// A random id in the standard UUID format, made when Charge opens. It goes
// with the order to Supabase, and a retry sends the same one, so the same
// payment can't be saved twice.
// crypto.randomUUID() would be shorter, but browsers only allow it on https
// or localhost, and an iPad opening the dev server uses plain http.
export function createOrderId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  // Two fixed parts of the format: "version 4" (random) and its "variant".
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
