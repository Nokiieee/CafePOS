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
