import { categories } from "@/components/pos/categories";
import { hasDrinkOptions, sizes } from "@/components/pos/item-options";
import { formatPrice } from "@/lib/format-price";

// Rules for adding and editing menu items: plain functions shared by the
// Menu page's popup (browser) and actions/menu.ts (server), which checks
// everything again. The database checks the same limits (supabase/menu.sql).

export const MAX_NAME_LENGTH = 60;
export const MAX_DESCRIPTION_LENGTH = 200;
/** $999.99, plenty for a cafe. */
export const MAX_PRICE_CENTS = 99_999;

/** Menu photos are squares this many pixels wide and tall, like the 17 starting ones. */
export const PHOTO_SIZE = 800;
/**
 * The largest photo the app uploads. An 800 × 800 JPEG is usually 100 to
 * 250 KB. This stays under the 1 MB a Server Action accepts (and the
 * bucket's limit, supabase/menu-photos.sql).
 */
export const MAX_PHOTO_BYTES = 900 * 1024;

/** The categories an item can be in: the rail's, without "All". */
export const MENU_CATEGORIES = categories.filter((category) => category.id !== "all");

/** What the popup sends: the item's details, already checked by checkMenuItem. */
export type MenuItemInput = {
  name: string;
  description: string;
  categoryId: string;
  /** For coffee, the Medium price. */
  priceCents: number;
};

/**
 * The lowest price an item can have, in cents. Coffee's price is the Medium
 * price, and a Small costs 50 cents less, so a coffee must cost more than
 * that for its Small to still cost something.
 */
export function minPriceCents(categoryId: string): number {
  if (!hasDrinkOptions({ categoryId })) return 1;
  const biggestDiscount = -Math.min(...sizes.map((size) => size.priceChange));
  return biggestDiscount + 1;
}

// "6", "6.5", "6.50", "$6.50" (up to $999.99).
const PRICE = /^\$?\s*(\d{1,3})(?:\.(\d{0,2}))?$/;

/** A typed price in cents: "6.5" is 650. null when it isn't a price. */
export function parsePrice(text: string): number | null {
  const match = PRICE.exec(text.trim());
  if (!match) return null;
  // "6.5" is 6 dollars and 50 cents: the cents are padded to two digits.
  return Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
}

/** A price in cents as the price box shows it: 650 is "6.50". */
export function priceText(cents: number): string {
  return (cents / 100).toFixed(2);
}

/**
 * Checks an item's details and tidies them (spaces trimmed). Gives a message
 * for the first problem found, in words for the admin.
 */
export function checkMenuItem(
  input: unknown,
): { ok: true; item: MenuItemInput } | { ok: false; message: string } {
  const { name, description, categoryId, priceCents } = (input ?? {}) as Partial<MenuItemInput>;

  // Runs of spaces become one, so "Iced  Latte" and "Iced Latte" are the same.
  const cleanName = typeof name === "string" ? name.trim().replace(/\s+/g, " ") : "";
  if (!cleanName) return { ok: false, message: "Give the item a name." };
  if (cleanName.length > MAX_NAME_LENGTH) {
    return { ok: false, message: `Keep the name to ${MAX_NAME_LENGTH} characters.` };
  }

  const cleanDescription = typeof description === "string" ? description.trim() : "";
  if (cleanDescription.length > MAX_DESCRIPTION_LENGTH) {
    return {
      ok: false,
      message: `Keep the description to ${MAX_DESCRIPTION_LENGTH} characters.`,
    };
  }

  if (!MENU_CATEGORIES.some((category) => category.id === categoryId)) {
    return { ok: false, message: "Pick a category." };
  }

  const problem = priceProblem(categoryId as string, priceCents);
  // No problem means a whole number of cents; the typeof is for TypeScript.
  if (problem || typeof priceCents !== "number") {
    return { ok: false, message: problem ?? "Type a price, like 6.50." };
  }

  return {
    ok: true,
    item: {
      name: cleanName,
      description: cleanDescription,
      categoryId: categoryId as string,
      priceCents,
    },
  };
}

/**
 * What's wrong with a price for this category, or null when it's fine.
 * Not a whole number of cents (or null: the typed text wasn't a price) is a problem too.
 */
export function priceProblem(categoryId: string, priceCents: unknown): string | null {
  if (typeof priceCents !== "number" || !Number.isInteger(priceCents)) {
    return "Type a price, like 6.50.";
  }
  const min = minPriceCents(categoryId);
  if (priceCents < min) {
    return min > 1
      ? `A coffee must cost at least ${formatPrice(min)}, so a Small still costs something.`
      : "The price must be more than $0.00.";
  }
  if (priceCents > MAX_PRICE_CENTS) {
    return `The price can be at most ${formatPrice(MAX_PRICE_CENTS)}.`;
  }
  return null;
}

/** True for an id like "iced-latte" (the same rule as the database's). */
export function isMenuItemId(value: unknown): value is string {
  return typeof value === "string" && value.length <= 60 && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(value);
}

/**
 * The id a new item starts from, made from its name: "Crème Brûlée" is
 * "creme-brulee". Letters lose their accents, anything else becomes a dash.
 */
export function idFromName(name: string): string {
  const id = name
    // "é" becomes "e" plus an accent mark, and the marks are then dropped.
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    // Room left for "-2", "-3"... within the database's 60.
    .slice(0, 50)
    .replace(/-+$/, "");
  // A name with no letters or numbers at all (only emoji, say).
  return id || "item";
}

/** The id itself if it's free, otherwise the first free "id-2", "id-3"... */
export function uniqueId(id: string, takenIds: string[]): string {
  const taken = new Set(takenIds);
  if (!taken.has(id)) return id;
  let number = 2;
  while (taken.has(`${id}-${number}`)) number++;
  return `${id}-${number}`;
}
