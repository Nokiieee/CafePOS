import { PiCoffeeBeanFill } from "react-icons/pi";
import { describeOptions, orderTypes } from "@/components/pos/bill";
import type { IceLevel, SizeId, SugarLevel } from "@/components/pos/item-options";
import { formatCafeDateTime } from "@/lib/cafe-time";
import { formatPrice } from "@/lib/format-price";
import type { SavedOrder, SavedOrderLine } from "@/lib/orders";

type OrderReceiptProps = {
  order: SavedOrder;
};

// One saved order as a receipt: when, who, every line, and the money.
export function OrderReceipt({ order }: OrderReceiptProps) {
  const orderType = orderTypes.find((type) => type.value === order.orderType)?.label;

  return (
    <article aria-label="Receipt" className="rounded-3xl bg-white px-6 py-7 ring-1 ring-latte-200">
      <header className="flex flex-col items-center gap-1 text-center">
        <PiCoffeeBeanFill aria-hidden className="size-8 text-espresso-900" />
        <p className="text-lg font-semibold tracking-tight">Cafe POS</p>
        <p className="text-sm text-roast-500 tabular-nums">{formatCafeDateTime(order.createdAt)}</p>
        <p className="text-sm text-roast-500">
          {orderType} · Cashier: {order.cashierName}
        </p>
      </header>

      <ul className="mt-5 space-y-3 border-t border-dashed border-latte-300 pt-5">
        {order.lines.map((line) => (
          <ReceiptLine key={line.lineNo} line={line} />
        ))}
      </ul>

      <dl className="mt-5 space-y-1.5 border-t border-dashed border-latte-300 pt-5">
        <div className="flex justify-between gap-3 text-lg font-semibold">
          <dt>Total</dt>
          <dd className="tabular-nums">{formatPrice(order.totalCents)}</dd>
        </div>
        <div className="flex justify-between gap-3 text-roast-500">
          <dt>Cash</dt>
          <dd className="tabular-nums">{formatPrice(order.cashReceivedCents)}</dd>
        </div>
        <div className="flex justify-between gap-3 text-roast-500">
          <dt>Change</dt>
          <dd className="tabular-nums">{formatPrice(order.changeCents)}</dd>
        </div>
      </dl>

      <p className="mt-6 text-center text-sm text-roast-500">Thank you!</p>
    </article>
  );
}

function ReceiptLine({ line }: { line: SavedOrderLine }) {
  return (
    <li>
      <div className="flex justify-between gap-3">
        <span className="font-medium">
          {line.quantity}× {line.name}
        </span>
        <span className="font-medium tabular-nums">{formatPrice(line.lineTotalCents)}</span>
      </div>
      {/* The options and the price of one, when they add something. */}
      {(line.size || line.quantity > 1) && (
        <p className="mt-0.5 text-sm leading-snug text-roast-500">
          {[savedOptions(line), line.quantity > 1 && `${formatPrice(line.unitPriceCents)} each`]
            .filter(Boolean)
            .join(" · ")}
        </p>
      )}
    </li>
  );
}

// "Large · Less ice · 50% sugar", the same words as on the bill. The database
// only accepts the app's own sizes and levels, so these values are safe to use.
function savedOptions(line: SavedOrderLine): string | null {
  if (!line.size || line.sugar === null || !line.ice) return null;
  return describeOptions({
    size: line.size as SizeId,
    sugar: line.sugar as SugarLevel,
    ice: line.ice as IceLevel,
  });
}
