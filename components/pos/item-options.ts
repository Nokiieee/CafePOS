import type { MenuItem } from "./menu-items";

// The choices a cashier can make for a drink, kept as data like the menu.

export const sizes = [
  { id: "small", short: "S", label: "Small", priceChange: -50 },
  { id: "medium", short: "M", label: "Medium", priceChange: 0 },
  { id: "large", short: "L", label: "Large", priceChange: 75 },
] as const;

export const sugarLevels = [0, 25, 50, 75, 100] as const;

export const iceLevels = ["Less", "Normal", "Extra"] as const;

// "typeof sizes[number]" means "any one entry of the sizes list".
export type SizeId = (typeof sizes)[number]["id"];
export type SugarLevel = (typeof sugarLevels)[number];
export type IceLevel = (typeof iceLevels)[number];

// What each option starts on when an item opens: the most common order.
export const defaultSize: SizeId = "medium";
export const defaultSugar: SugarLevel = 100;
export const defaultIce: IceLevel = "Normal";

export const MAX_QUANTITY = 99;

// Only drinks get Size, Sugar and Ice. Sides and pasta only get a quantity.
export function hasDrinkOptions(item: MenuItem): boolean {
  return item.categoryId === "coffee";
}

// The price of one item with the chosen size, in cents.
// The menu price is the Medium price.
export function unitPrice(item: MenuItem, size: SizeId): number {
  if (!hasDrinkOptions(item)) return item.price;
  const change = sizes.find((s) => s.id === size)?.priceChange ?? 0;
  return item.price + change;
}
