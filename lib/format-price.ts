// Created once and reused, because building a formatter is slower than using one.
const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

// Turns a price in cents into text for the screen: 650 → "$6.50".
export function formatPrice(cents: number): string {
  return usd.format(cents / 100);
}
