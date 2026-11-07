"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  PiCaretUpBold,
  PiMinusBold,
  PiPlusBold,
  PiReceipt,
  PiTrash,
  PiX,
} from "react-icons/pi";
import { formatPrice } from "@/lib/format-price";
import { describeOptions, lineTotal, orderTypes, type BillLine } from "./bill";
import { MAX_QUANTITY } from "./item-options";
import { SegmentedControl } from "./option-controls";
import type { Bill } from "./use-bill";

type BillPanelProps = {
  bill: Bill;
};

// The bill on the right of the cashier screen. On phones it hides behind a bar
// at the bottom of the screen, because there's no room for a third column.
export function BillPanel({ bill }: BillPanelProps) {
  const [isOpenOnPhone, setIsOpenOnPhone] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);
  const isEmpty = bill.lines.length === 0;
  const itemsLabel = `${bill.itemCount} ${bill.itemCount === 1 ? "item" : "items"}`;

  // Bring the row that was just added into view.
  useEffect(() => {
    if (!bill.lastAdded) return;
    listRef.current
      ?.querySelector(`[data-line="${CSS.escape(bill.lastAdded.key)}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [bill.lastAdded]);

  return (
    <>
      {!isEmpty && (
        <button
          type="button"
          onClick={() => setIsOpenOnPhone(true)}
          className="fixed inset-x-3 bottom-3 z-10 flex h-14 items-center justify-between gap-3 rounded-2xl bg-espresso-700 px-5 font-semibold text-milk shadow-[0_12px_32px_-12px_rgb(61_36_25/0.35)] outline-none focus-visible:ring-2 focus-visible:ring-espresso-700 focus-visible:ring-offset-2 focus-visible:ring-offset-milk active:bg-espresso-900 md:hidden"
        >
          <span className="flex items-center gap-2">
            <PiCaretUpBold aria-hidden className="size-4" />
            View bill · {itemsLabel}
          </span>
          <span className="tabular-nums">{formatPrice(bill.total)}</span>
        </button>
      )}

      <aside
        aria-label="Current bill"
        className={`z-20 min-h-0 flex-col border-latte-200 bg-white md:static md:flex md:w-72 md:shrink-0 md:border-l lg:w-84 ${
          isOpenOnPhone ? "fixed inset-0 flex" : "hidden"
        }`}
      >
        <div className="flex flex-col gap-4 px-5 pt-6 pb-4">
          <div className="flex min-h-11 items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-xl leading-tight font-semibold tracking-tight">
                Current bill
              </h2>
              <p className="mt-0.5 text-sm text-roast-500 tabular-nums">
                {bill.id ? `#${bill.id}` : "New bill"}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {!isEmpty && <ClearButton onClear={bill.clear} />}
              <button
                type="button"
                aria-label="Close bill"
                onClick={() => setIsOpenOnPhone(false)}
                className="flex size-11 items-center justify-center rounded-xl text-roast-500 transition-colors duration-200 outline-none hover:bg-latte-100 focus-visible:ring-2 focus-visible:ring-espresso-700 active:bg-latte-200 md:hidden"
              >
                <PiX aria-hidden className="size-6" />
              </button>
            </div>
          </div>

          <div role="radiogroup" aria-label="Order type">
            <SegmentedControl
              name="order-type"
              value={bill.orderType}
              onChange={bill.setOrderType}
              options={orderTypes}
            />
          </div>
        </div>

        {isEmpty ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-latte-100 text-espresso-700">
              <PiReceipt aria-hidden className="size-7" />
            </div>
            <div>
              <p className="font-semibold text-espresso-950">No items yet</p>
              <p className="mt-0.5 text-sm text-roast-500">
                Tap a menu item to start the bill.
              </p>
            </div>
          </div>
        ) : (
          <ul
            ref={listRef}
            className="min-h-0 flex-1 divide-y divide-latte-200 overflow-y-auto border-t border-latte-200 px-5 [scrollbar-color:var(--color-latte-300)_transparent] motion-safe:scroll-smooth"
          >
            {bill.lines.map((line) => (
              <BillRow
                key={line.key}
                line={line}
                onChangeQuantity={(change) => bill.changeQuantity(line.key, change)}
              />
            ))}
          </ul>
        )}

        {/* The one dark block on this side, like the puck on the other. */}
        <div className="m-3 flex flex-col gap-4 rounded-3xl bg-espresso-700 p-4 text-milk">
          <div className="flex items-end justify-between gap-3 px-1">
            <div>
              <p className="text-sm text-latte-200">{isEmpty ? "No items" : itemsLabel}</p>
              <p className="font-semibold">Total</p>
            </div>
            <p
              aria-live="polite"
              className="text-3xl leading-none font-semibold tracking-tight tabular-nums"
            >
              {formatPrice(bill.total)}
            </p>
          </div>

          {/* Payment comes in a later step, so this doesn't do anything yet. */}
          <button
            type="button"
            disabled={isEmpty}
            className="h-14 w-full rounded-2xl bg-milk text-lg font-semibold text-espresso-800 transition-colors duration-200 outline-none hover:bg-latte-100 focus-visible:ring-2 focus-visible:ring-milk focus-visible:ring-offset-2 focus-visible:ring-offset-espresso-700 active:bg-latte-200 disabled:cursor-not-allowed disabled:bg-espresso-600 disabled:text-latte-200"
          >
            Charge
          </button>
        </div>
      </aside>
    </>
  );
}

type BillRowProps = {
  line: BillLine;
  onChangeQuantity: (change: number) => void;
};

function BillRow({ line, onChangeQuantity }: BillRowProps) {
  const isLast = line.quantity === 1;

  return (
    <li
      data-line={line.key}
      className="flex gap-3 py-3 transition-[opacity,translate] duration-300 ease-out-expo motion-reduce:transition-none starting:translate-y-2 starting:opacity-0"
    >
      <div className="min-w-0 flex-1">
        <p className="leading-snug font-medium text-espresso-950">{line.name}</p>
        {line.options && (
          <p className="mt-0.5 text-sm leading-snug text-roast-500">
            {describeOptions(line.options)}
          </p>
        )}
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <p className="leading-snug font-semibold text-espresso-700 tabular-nums">
          {formatPrice(lineTotal(line))}
        </p>
        <div
          role="group"
          aria-label={`${line.name} quantity`}
          className="flex h-11 items-center rounded-xl ring-1 ring-latte-300"
        >
          {/* At 1, minus would empty the row, so it says what it really does. */}
          <RowButton
            label={isLast ? `Remove ${line.name}` : `Decrease ${line.name}`}
            onClick={() => onChangeQuantity(-1)}
          >
            {isLast ? (
              <PiTrash aria-hidden className="size-4" />
            ) : (
              <PiMinusBold aria-hidden className="size-3.5" />
            )}
          </RowButton>
          <output
            aria-live="polite"
            className="w-6 text-center font-semibold text-espresso-950 tabular-nums"
          >
            {line.quantity}
          </output>
          <RowButton
            label={`Increase ${line.name}`}
            disabled={line.quantity >= MAX_QUANTITY}
            onClick={() => onChangeQuantity(1)}
          >
            <PiPlusBold aria-hidden className="size-3.5" />
          </RowButton>
        </div>
      </div>
    </li>
  );
}

type RowButtonProps = {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
};

function RowButton({ label, disabled, onClick, children }: RowButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-full w-10 items-center justify-center rounded-xl text-espresso-800 transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-espresso-700 focus-visible:ring-inset active:bg-latte-100 disabled:cursor-not-allowed disabled:text-roast-400 disabled:active:bg-transparent"
    >
      {children}
    </button>
  );
}

type ClearButtonProps = {
  onClear: () => void;
};

// Clearing can't be undone, so it takes two taps. The second tap has to come
// within 3 seconds, or the button goes back to normal.
function ClearButton({ onClear }: ClearButtonProps) {
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    if (!isConfirming) return;
    const timer = setTimeout(() => setIsConfirming(false), 3000);
    return () => clearTimeout(timer);
  }, [isConfirming]);

  return (
    <button
      type="button"
      onClick={() => {
        if (isConfirming) onClear();
        setIsConfirming(!isConfirming);
      }}
      className={`h-11 rounded-xl px-3 text-sm font-medium whitespace-nowrap transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-espresso-700 active:bg-latte-200 ${
        isConfirming
          ? "bg-latte-100 font-semibold text-espresso-900"
          : "text-roast-500 hover:bg-latte-100 hover:text-espresso-900"
      }`}
    >
      {isConfirming ? "Tap again" : "Clear all"}
    </button>
  );
}
