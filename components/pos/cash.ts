// Plain rules for taking cash: what the number pad types, and which amounts
// to offer as one-tap buttons. All amounts are in cents, like the bill.

/** The keys on the charge popup's number pad. */
export type CashKey =
  | "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9"
  | "."
  | "backspace";

// Up to 5 digits before the point ($99,999.99) is plenty for a cafe.
const MAX_DOLLAR_DIGITS = 5;

// What the cashier has typed is kept as text, like "20" or "13.5", so a
// half-typed amount ("13.") still looks the way it was typed. It turns into
// cents only when it's used.

/** The typed text after one more key: "13" then "." is "13.". */
export function pressCashKey(entry: string, key: CashKey): string {
  if (key === "backspace") return entry.slice(0, -1);

  const [dollars, cents] = entry.split(".");

  if (key === ".") {
    if (cents !== undefined) return entry; // There's already a point.
    return `${entry || "0"}.`;
  }

  // A digit. After the point, at most 2 digits are allowed.
  if (cents !== undefined) return cents.length < 2 ? entry + key : entry;
  // No leading zeros: "0" then "5" is "5".
  if (dollars === "0") return key;
  return dollars.length < MAX_DOLLAR_DIGITS ? entry + key : entry;
}

/** The typed text in cents: "13.5" is 1350, and "" is 0. */
export function cashEntryToCents(entry: string): number {
  const [dollars, cents = ""] = entry.split(".");
  return Number(dollars || "0") * 100 + Number(cents.padEnd(2, "0"));
}

/** Cents as typed text, for the one-tap buttons: 2000 is "20", 1350 is "13.50". */
export function centsToCashEntry(cents: number): string {
  const dollars = Math.floor(cents / 100);
  const rest = cents % 100;
  return rest === 0 ? String(dollars) : `${dollars}.${String(rest).padStart(2, "0")}`;
}

/** The typed text for the screen, as it was typed: "1250.5" is "$1,250.5". */
export function formatCashEntry(entry: string): string {
  const [dollars, cents] = entry.split(".");
  const grouped = Number(dollars || "0").toLocaleString("en-US");
  return cents === undefined ? `$${grouped}` : `$${grouped}.${cents}`;
}

// Notes a customer is likely to hand over, in cents ($1 is for rounding up).
const NOTES = [100, 500, 1000, 2000, 5000, 10000];

/**
 * Up to 5 likely amounts above the total, smallest first. For $13.50 that's
 * $14, $15, $20, $50 and $100. The exact amount gets its own button.
 */
export function quickCashAmounts(total: number): number[] {
  const amounts = new Set<number>();

  for (const note of NOTES) {
    // The total rounded up to this note: $13.50 rounded up to $5 notes is $15.
    const amount = Math.ceil(total / note) * note;
    if (amount > total) amounts.add(amount);
  }

  return [...amounts].sort((a, b) => a - b).slice(0, 5);
}
