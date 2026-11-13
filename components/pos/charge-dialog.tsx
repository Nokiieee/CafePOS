"use client";

import {
  useEffect,
  useEffectEvent,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  PiBackspace,
  PiCheckCircleFill,
  PiSpinnerGap,
  PiWarningCircleFill,
  PiX,
} from "react-icons/pi";
import type { SaveOrderResult } from "@/actions/orders";
import { formatPrice } from "@/lib/format-price";
import { orderTypes, type OrderType } from "./bill";
import {
  cashEntryToCents,
  centsToCashEntry,
  formatCashEntry,
  pressCashKey,
  quickCashAmounts,
  type CashKey,
} from "./cash";
import { SegmentedControl } from "./option-controls";

/** A finished cash payment (amounts in cents). Kept so it can be shown after the bill clears. */
type Payment = {
  total: number;
  received: number;
  orderType: OrderType;
};

type ChargeDialogProps = {
  /** The id of the order being paid for. null means the popup is closed. */
  orderId: string | null;
  /** The bill total, in cents. */
  total: number;
  /** The bill's Dine In / Take Out. The popup can change it too. */
  orderType: OrderType;
  onOrderTypeChange: (orderType: OrderType) => void;
  /** Called after the popup closes, however it was closed. */
  onClose: () => void;
  /** Saves the paid order. */
  onPay: (orderId: string, cashReceivedCents: number) => Promise<SaveOrderResult>;
  /** Called once the order is saved, to clear the bill. Not called if saving fails. */
  onPaid: () => void;
};

// Shown when the request never got an answer, e.g. the Wi-Fi dropped.
const NO_CONNECTION_MESSAGE =
  "Couldn't reach the server. Check the internet connection and try again.";

// The popup that opens from Charge. First the cashier enters the cash the
// customer handed over; Confirm saves the order, then it shows the change
// until New order. Like the item popup, it's the browser's own <dialog>.
export function ChargeDialog({
  orderId,
  total,
  orderType,
  onOrderTypeChange,
  onClose,
  onPay,
  onPaid,
}: ChargeDialogProps) {
  const isOpen = orderId !== null;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  // True while the order is being saved.
  const [isSaving, setIsSaving] = useState(false);
  // Why the last save failed, shown above Confirm.
  const [error, setError] = useState<string | null>(null);
  // Set once paid. The bill is already cleared by then, so this keeps the numbers.
  const [payment, setPayment] = useState<Payment | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (isOpen && dialog && !dialog.open) {
      dialog.showModal();
      // As in the item popup: focus the content, so Safari draws no focus ring
      // on the first button.
      contentRef.current?.focus();
    }
  }, [isOpen]);

  function close() {
    dialogRef.current?.close();
  }

  async function pay(received: number) {
    if (!orderId || isSaving) return;

    // Copied now: once saved, the bill clears and these drop back to defaults.
    const paid: Payment = { total, received, orderType };
    setIsSaving(true);
    setError(null);

    let result: SaveOrderResult | undefined;
    try {
      result = await onPay(orderId, received);
    } catch {
      // The request itself failed, so there's no result to read.
      result = undefined;
    }

    setIsSaving(false);
    if (result?.ok) {
      // The Confirm button is about to disappear; keep focus inside.
      contentRef.current?.focus();
      // Both in the same update, so the cash screen never shows the empty
      // bill's $0.00 before the paid screen replaces it.
      setPayment(paid);
      onPaid();
    } else {
      // The bill and the typed cash stay, so Try again sends the same order.
      setError(result?.message ?? NO_CONNECTION_MESSAGE);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      // Escape closes the popup, except while saving: the order might still
      // be saved, and closing would leave its bill on screen to charge again.
      onCancel={(event) => {
        if (isSaving) event.preventDefault();
      }}
      onClose={() => {
        setPayment(null);
        setError(null);
        onClose();
      }}
      // A tap on the dark area around the popup cancels the charge. While
      // saving, or once paid, it does nothing, so the change can't vanish
      // before it's handed over.
      onClick={(event) => {
        if (event.target === event.currentTarget && !payment && !isSaving) close();
      }}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto overscroll-contain rounded-3xl bg-white p-0 text-espresso-950 shadow-[0_24px_64px_-16px_rgb(42_24_16/0.45)] transition-[opacity,translate] duration-300 ease-out-expo [scrollbar-color:var(--color-latte-300)_transparent] backdrop:bg-espresso-950/40 motion-reduce:transition-none starting:open:translate-y-4 starting:open:opacity-0 md:max-w-3xl"
    >
      <div ref={contentRef} tabIndex={-1} className="outline-none">
        {/* Only drawn while open, so every charge starts with nothing typed. */}
        {isOpen &&
          (payment ? (
            <PaidView titleId={titleId} payment={payment} onDone={close} />
          ) : (
            <CashView
              titleId={titleId}
              total={total}
              orderType={orderType}
              isSaving={isSaving}
              error={error}
              onOrderTypeChange={onOrderTypeChange}
              onCancel={close}
              onConfirm={pay}
            />
          ))}
      </div>
    </dialog>
  );
}

type CashViewProps = {
  titleId: string;
  total: number;
  orderType: OrderType;
  isSaving: boolean;
  error: string | null;
  onOrderTypeChange: (orderType: OrderType) => void;
  onCancel: () => void;
  onConfirm: (received: number) => void;
};

function CashView({
  titleId,
  total,
  orderType,
  isSaving,
  error,
  onOrderTypeChange,
  onCancel,
  onConfirm,
}: CashViewProps) {
  // What's typed so far, as text ("13.5"). See cash.ts.
  const [entry, setEntry] = useState("");
  // After a one-tap amount, the next key starts a new amount instead of
  // adding to it ($20 then "5" is $5, not $205).
  const [startsOver, setStartsOver] = useState(false);

  const received = cashEntryToCents(entry);
  const isEnough = received >= total;

  function press(key: CashKey) {
    if (startsOver) {
      setEntry(key === "backspace" ? "" : pressCashKey("", key));
      setStartsOver(false);
    } else {
      setEntry(pressCashKey(entry, key));
    }
  }

  function pick(amount: number) {
    setEntry(centsToCashEntry(amount));
    setStartsOver(true);
  }

  function confirm() {
    if (isEnough && !isSaving) onConfirm(received);
  }

  // A real keyboard works too: digits, the point, Backspace and Enter.
  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    // While saving, the amount is locked, like the buttons.
    if (isSaving) {
      if (event.key === "Enter") event.preventDefault();
      return;
    }

    if (/^[0-9.]$/.test(event.key)) {
      press(event.key as CashKey);
    } else if (event.key === "Backspace") {
      press("backspace");
    } else if (event.key === "Enter") {
      // Stop Enter from also pressing whichever button has focus.
      event.preventDefault();
      if (!event.repeat) confirm();
    } else {
      return;
    }
    event.preventDefault();
  });

  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      {/* Wide screens: title, then Dine In / Take Out, then X, in one row.
          Narrow screens: the switch wraps to its own full-width row below.
          inert while saving: nothing in here can be tapped or focused, so the
          order can't change while it's being saved. */}
      <div
        inert={isSaving}
        className="flex flex-wrap items-center gap-x-4 gap-y-3 px-5 pt-5 sm:px-7 sm:pt-6"
      >
        <h2 id={titleId} className="text-2xl font-semibold tracking-tight">
          Cash payment
        </h2>
        {/* The same switch as on the bill, so it can be checked before paying.
            It sits up here, not beside the amounts, so it doesn't make that
            column taller and stretch the gaps in the number pad.
            A different name keeps its radios apart from the bill's. */}
        <div
          role="radiogroup"
          aria-label="Order type"
          className="order-last w-full md:order-none md:ml-auto md:w-60"
        >
          <SegmentedControl
            name="charge-order-type"
            value={orderType}
            onChange={onOrderTypeChange}
            options={orderTypes}
          />
        </div>
        <button
          type="button"
          aria-label="Cancel"
          onClick={onCancel}
          className="-mr-2 ml-auto flex size-11 md:ml-0 items-center justify-center rounded-xl text-roast-500 transition-colors duration-200 outline-none hover:bg-latte-100 hover:text-espresso-900 focus-visible:ring-2 focus-visible:ring-espresso-700 active:bg-latte-200"
        >
          <PiX aria-hidden className="size-6" />
        </button>
      </div>

      <div inert={isSaving} className="grid gap-6 p-5 sm:px-7 md:grid-cols-2 md:gap-8">
        <div className="space-y-5">
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-medium text-roast-500">Amount due</span>
            <span className="text-2xl font-semibold text-espresso-950 tabular-nums">
              {formatPrice(total)}
            </span>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-espresso-900">Cash received</p>
            <output
              aria-live="polite"
              className={`flex h-16 items-center justify-end rounded-2xl bg-white px-4 text-3xl font-semibold tracking-tight tabular-nums ring-2 ring-espresso-700 ${
                entry ? "text-espresso-950" : "text-roast-400"
              }`}
            >
              {entry ? formatCashEntry(entry) : "$0"}
            </output>
            <ChangeLine entry={entry} received={received} total={total} />
          </div>

          <div role="group" aria-label="Quick amounts" className="grid grid-cols-3 gap-2">
            <QuickButton isPicked={startsOver && received === total} onClick={() => pick(total)}>
              <span className="text-sm leading-tight font-medium text-roast-500">Exact</span>
              <span className="leading-tight">{formatPrice(total)}</span>
            </QuickButton>
            {quickCashAmounts(total).map((amount) => (
              <QuickButton
                key={amount}
                isPicked={startsOver && received === amount}
                onClick={() => pick(amount)}
              >
                {centsToDollars(amount)}
              </QuickButton>
            ))}
          </div>
        </div>

        <div role="group" aria-label="Number pad" className="grid grid-cols-3 gap-2">
          {(["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0"] as const).map((key) => (
            <PadButton key={key} onClick={() => press(key)}>
              {key}
            </PadButton>
          ))}
          <PadButton label="Delete" onClick={() => press("backspace")}>
            <PiBackspace aria-hidden className="size-7" />
          </PadButton>
        </div>
      </div>

      <div className="sticky bottom-0 z-10 border-t border-latte-200 bg-milk px-5 py-4 sm:px-7">
        {/* role="alert" makes screen readers read it out as soon as it appears. */}
        {error && (
          <p
            role="alert"
            className="mb-3 flex items-start gap-2.5 rounded-2xl bg-latte-100 px-4 py-3 text-sm leading-snug font-medium text-espresso-900"
          >
            <PiWarningCircleFill aria-hidden className="size-5 shrink-0 text-espresso-700" />
            {error}
          </p>
        )}
        {/* While saving it stays dark (aria-disabled, not disabled), so it
            reads as "working on it" rather than "not allowed". */}
        <button
          type="button"
          disabled={!isEnough}
          aria-disabled={isSaving}
          onClick={confirm}
          className={`flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-espresso-700 text-lg font-semibold text-milk transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-espresso-700 focus-visible:ring-offset-2 focus-visible:ring-offset-milk disabled:cursor-not-allowed disabled:bg-latte-200 disabled:text-roast-400 ${
            isSaving ? "cursor-wait" : "hover:bg-espresso-800 active:bg-espresso-900"
          }`}
        >
          {isSaving ? (
            <>
              <PiSpinnerGap aria-hidden className="size-5 animate-spin motion-reduce:animate-none" />
              Saving…
            </>
          ) : error ? (
            "Try again"
          ) : (
            "Confirm payment"
          )}
        </button>
      </div>
    </>
  );
}

// "$20" rather than "$20.00": the quick buttons are always whole notes.
function centsToDollars(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US")}`;
}

type ChangeLineProps = {
  entry: string;
  received: number;
  total: number;
};

// Under the cash box: the change, or how much is still missing.
function ChangeLine({ entry, received, total }: ChangeLineProps) {
  let text: ReactNode;

  if (!entry) {
    text = <span className="text-roast-500">Type the amount, or tap one below.</span>;
  } else if (received < total) {
    text = (
      <span className="text-roast-500">
        Still needs{" "}
        <span className="font-semibold text-espresso-900 tabular-nums">
          {formatPrice(total - received)}
        </span>
      </span>
    );
  } else {
    text = (
      <>
        <span className="font-medium text-roast-500">Change</span>
        <span className="text-2xl font-semibold text-espresso-700 tabular-nums">
          {formatPrice(received - total)}
        </span>
      </>
    );
  }

  return (
    <p className="mt-2 flex min-h-8 items-baseline justify-between gap-3 px-1">{text}</p>
  );
}

type QuickButtonProps = {
  isPicked: boolean;
  onClick: () => void;
  children: ReactNode;
};

function QuickButton({ isPicked, onClick, children }: QuickButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={isPicked}
      onClick={onClick}
      className={`flex h-14 flex-col items-center justify-center rounded-2xl text-lg font-semibold text-espresso-950 tabular-nums transition-[background-color,box-shadow] duration-200 outline-none focus-visible:ring-2 focus-visible:ring-espresso-700 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${
        isPicked
          ? "bg-latte-100 ring-2 ring-espresso-700"
          : "ring-1 ring-latte-300 hover:ring-roast-400 active:bg-latte-100"
      }`}
    >
      {children}
    </button>
  );
}

type PadButtonProps = {
  /** For keys that show an icon instead of text. */
  label?: string;
  onClick: () => void;
  children: ReactNode;
};

function PadButton({ label, onClick, children }: PadButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-14 items-center justify-center rounded-2xl bg-latte-100 text-2xl font-semibold text-espresso-900 transition-colors duration-200 outline-none select-none hover:bg-latte-200 focus-visible:ring-2 focus-visible:ring-espresso-700 active:bg-latte-300 md:h-16"
    >
      {children}
    </button>
  );
}

type PaidViewProps = {
  titleId: string;
  payment: Payment;
  onDone: () => void;
};

// Shown after Confirm. It stays until New order, so the cashier can read the
// change while counting it out.
function PaidView({ titleId, payment, onDone }: PaidViewProps) {
  const change = payment.received - payment.total;

  // Enter starts the next order, like tapping New order.
  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (event.key !== "Enter" || event.repeat) return;
    event.preventDefault();
    onDone();
  });

  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-6 pt-10 pb-6 text-center sm:px-8">
      <PiCheckCircleFill aria-hidden className="size-16 text-espresso-700" />
      <h2 id={titleId} className="mt-3 text-2xl font-semibold tracking-tight">
        Payment received
      </h2>

      <p className="mt-8 font-medium text-roast-500">Change</p>
      <p
        aria-live="polite"
        className="text-6xl leading-tight font-semibold tracking-tight text-espresso-700 tabular-nums"
      >
        {formatPrice(change)}
      </p>
      <p className="mt-1 text-roast-500">
        {change > 0 ? "Hand this back to the customer." : "No change due."}
      </p>

      <dl className="mt-8 w-full divide-y divide-latte-200 rounded-2xl text-left ring-1 ring-latte-200">
        <div className="flex justify-between gap-3 px-4 py-3">
          <dt className="text-roast-500">Order type</dt>
          <dd className="font-semibold">
            {orderTypes.find((type) => type.value === payment.orderType)?.label}
          </dd>
        </div>
        <div className="flex justify-between gap-3 px-4 py-3">
          <dt className="text-roast-500">Total</dt>
          <dd className="font-semibold tabular-nums">{formatPrice(payment.total)}</dd>
        </div>
        <div className="flex justify-between gap-3 px-4 py-3">
          <dt className="text-roast-500">Cash received</dt>
          <dd className="font-semibold tabular-nums">{formatPrice(payment.received)}</dd>
        </div>
      </dl>

      <button
        type="button"
        onClick={onDone}
        className="mt-6 h-14 w-full rounded-2xl bg-espresso-700 text-lg font-semibold text-milk transition-colors duration-200 outline-none hover:bg-espresso-800 focus-visible:ring-2 focus-visible:ring-espresso-700 focus-visible:ring-offset-2 focus-visible:ring-offset-white active:bg-espresso-900"
      >
        New order
      </button>
    </div>
  );
}
