"use client";

import { useEffect, useId, useRef, useState } from "react";
import { PiSpinnerGap, PiWarningCircleFill, PiX } from "react-icons/pi";
import { voidOrder, type VoidOrderResult } from "@/actions/voids";
import { formatCafeTime } from "@/lib/cafe-time";
import { formatPrice } from "@/lib/format-price";
import type { SavedOrder } from "@/lib/orders";
import { MAX_VOID_REASON_LENGTH, VOID_REASONS } from "@/lib/voids";
import { orderSummary } from "./order-list";

type VoidDialogProps = {
  /** The order to void. null means the popup is closed. */
  order: SavedOrder | null;
  /** Called after the popup closes, however it was closed. */
  onClose: () => void;
};

// Shown when the request never got an answer, e.g. the Wi-Fi dropped.
const NO_CONNECTION_MESSAGE =
  "Couldn't reach the server. Check the internet connection and try again.";

// The last choice, where the admin types their own reason.
const OTHER = "Other";

// The popup that opens from Void order on a receipt (admins only). The admin
// picks a reason and confirms. Like the payment popup, it's the browser's
// own <dialog>.
export function VoidDialog({ order, onClose }: VoidDialogProps) {
  const isOpen = order !== null;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  // True while the void is being saved.
  const [isSaving, setIsSaving] = useState(false);
  // Why the last try failed, shown above the button.
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (isOpen && dialog && !dialog.open) {
      dialog.showModal();
      // As in the other popups: focus the content, so Safari draws no focus
      // ring on the first button.
      contentRef.current?.focus();
    }
  }, [isOpen]);

  function close() {
    dialogRef.current?.close();
  }

  async function confirm(reason: string) {
    if (!order || isSaving) return;

    setIsSaving(true);
    setError(null);

    let result: VoidOrderResult | undefined;
    try {
      result = await voidOrder(order.id, reason);
    } catch {
      // The request itself failed, so there's no result to read.
      result = undefined;
    }

    setIsSaving(false);
    if (result?.ok) {
      // The page has already reloaded its orders, so the receipt behind the
      // popup now shows Voided.
      close();
    } else {
      // The picked reason stays, so Try again sends the same void.
      setError(result?.message ?? NO_CONNECTION_MESSAGE);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      // Escape closes the popup, except while saving, so it can't vanish
      // halfway through.
      onCancel={(event) => {
        if (isSaving) event.preventDefault();
      }}
      onClose={() => {
        setError(null);
        onClose();
      }}
      // A tap on the dark area around the popup closes it, except while saving.
      onClick={(event) => {
        if (event.target === event.currentTarget && !isSaving) close();
      }}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto overscroll-contain rounded-3xl bg-white p-0 text-espresso-950 shadow-[0_24px_64px_-16px_rgb(42_24_16/0.45)] transition-[opacity,translate] duration-300 ease-out-expo [scrollbar-color:var(--color-latte-300)_transparent] backdrop:bg-espresso-950/40 motion-reduce:transition-none starting:open:translate-y-4 starting:open:opacity-0"
    >
      <div ref={contentRef} tabIndex={-1} className="outline-none">
        {/* Only drawn while open, so every void starts with no reason picked. */}
        {order && (
          <VoidForm
            titleId={titleId}
            order={order}
            isSaving={isSaving}
            error={error}
            onCancel={close}
            onConfirm={confirm}
          />
        )}
      </div>
    </dialog>
  );
}

type VoidFormProps = {
  titleId: string;
  order: SavedOrder;
  isSaving: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
};

function VoidForm({ titleId, order, isSaving, error, onCancel, onConfirm }: VoidFormProps) {
  const reasonTitleId = useId();
  // The picked reason, or OTHER. Nothing is picked to begin with, so a reason
  // is always a real choice.
  const [choice, setChoice] = useState<string | null>(null);
  const [otherText, setOtherText] = useState("");

  // The words that get saved. Empty until there's a reason, which keeps the
  // button disabled.
  const reason = choice === OTHER ? otherText.trim() : (choice ?? "");

  return (
    // A form, so Enter in the Other box confirms too.
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (reason && !isSaving) onConfirm(reason);
      }}
    >
      {/* inert while saving: nothing in here can be tapped or focused, so the
          reason can't change halfway. */}
      <div inert={isSaving} className="flex items-start gap-4 px-5 pt-5 sm:px-7 sm:pt-6">
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className="text-2xl font-semibold tracking-tight">
            Void this order?
          </h2>
          <p className="mt-1 text-roast-500 tabular-nums">
            {formatCafeTime(order.createdAt)} · Cashier: {order.cashierName}
          </p>
        </div>
        <button
          type="button"
          aria-label="Cancel"
          onClick={onCancel}
          className="-mt-1 -mr-2 flex size-11 shrink-0 items-center justify-center rounded-xl text-roast-500 transition-colors duration-200 outline-none hover:bg-latte-100 hover:text-espresso-900 focus-visible:ring-2 focus-visible:ring-espresso-700 active:bg-latte-200"
        >
          <PiX aria-hidden className="size-6" />
        </button>
      </div>

      <div inert={isSaving} className="space-y-6 p-5 sm:px-7">
        {/* What's being voided. */}
        <div className="flex items-baseline justify-between gap-4 rounded-2xl bg-latte-100 px-4 py-3">
          <span className="min-w-0 font-medium">{orderSummary(order)}</span>
          <span className="shrink-0 font-semibold tabular-nums">
            {formatPrice(order.totalCents)}
          </span>
        </div>

        <div role="radiogroup" aria-labelledby={reasonTitleId}>
          <p id={reasonTitleId} className="mb-2.5 text-sm font-semibold text-espresso-900">
            Reason
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {[...VOID_REASONS, OTHER].map((option) => (
              <ReasonChoice
                key={option}
                label={option}
                isSelected={choice === option}
                onSelect={() => setChoice(option)}
              />
            ))}
          </div>
          {choice === OTHER && (
            <input
              type="text"
              aria-label="Reason for the void"
              placeholder="Type the reason"
              maxLength={MAX_VOID_REASON_LENGTH}
              value={otherText}
              onChange={(event) => setOtherText(event.target.value)}
              autoFocus
              className="mt-2 h-12 w-full rounded-2xl bg-white px-4 text-espresso-950 ring-1 ring-latte-300 transition-shadow duration-200 outline-none placeholder:text-roast-400 focus:ring-2 focus:ring-espresso-700"
            />
          )}
        </div>

        {/* The total, not the cash handed over: the customer already got
            their change. */}
        <p className="text-sm leading-relaxed text-roast-500">
          Give the customer back{" "}
          <span className="font-semibold text-espresso-900 tabular-nums">
            {formatPrice(order.totalCents)}
          </span>
          . The order stays in history, marked Voided. This can&apos;t be undone.
        </p>
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
        {/* Red: the one color outside the browns, kept for things going wrong.
            While saving it stays red (aria-disabled, not disabled), so it reads
            as "working on it" rather than "not allowed". */}
        <button
          type="submit"
          disabled={!reason}
          aria-disabled={isSaving}
          className={`flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-red-700 text-lg font-semibold text-white transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2 focus-visible:ring-offset-milk disabled:cursor-not-allowed disabled:bg-latte-200 disabled:text-roast-400 ${
            isSaving ? "cursor-wait" : "hover:bg-red-800 active:bg-red-900"
          }`}
        >
          {isSaving ? (
            <>
              <PiSpinnerGap aria-hidden className="size-5 animate-spin motion-reduce:animate-none" />
              Voiding…
            </>
          ) : error ? (
            "Try again"
          ) : (
            "Void order"
          )}
        </button>
      </div>
    </form>
  );
}

type ReasonChoiceProps = {
  label: string;
  isSelected: boolean;
  onSelect: () => void;
};

// One reason, styled like the size cards in the item popup. Underneath it's a
// real radio button, so arrow keys and screen readers just work.
function ReasonChoice({ label, isSelected, onSelect }: ReasonChoiceProps) {
  return (
    <label
      className={`flex h-12 cursor-pointer items-center rounded-2xl px-4 font-medium transition-[background-color,box-shadow] duration-200 select-none has-focus-visible:ring-2 has-focus-visible:ring-espresso-700 has-focus-visible:ring-offset-2 has-focus-visible:ring-offset-white ${
        isSelected
          ? "bg-latte-100 ring-2 ring-espresso-700"
          : "ring-1 ring-latte-300 hover:ring-roast-400 active:bg-latte-100"
      }`}
    >
      <input
        type="radio"
        name="void-reason"
        value={label}
        checked={isSelected}
        onChange={onSelect}
        className="sr-only"
      />
      {label}
    </label>
  );
}
