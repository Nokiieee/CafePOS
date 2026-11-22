"use client";

import { useEffect, useId, useRef, useState } from "react";
import { PiX } from "react-icons/pi";
import { DatesField } from "@/components/orders/dates-field";
import { dayCount, filterDays, type DateChoice } from "@/lib/date-range";
import { MAX_SUMMARY_DAYS } from "@/lib/summary";

type SummaryDatesDialogProps = {
  isOpen: boolean;
  /** The dates shown now; the popup starts from these each time it opens. */
  dates: DateChoice;
  /** The day the page shows: the first choice. */
  day: string;
  today: string;
  /** Apply dates was tapped: show these. */
  onApply: (dates: DateChoice) => void;
  /** Called after the popup closes, however it was closed. */
  onClose: () => void;
};

// The Dates popup on Summary: the same choices as the Orders Filters popup
// (the day shown, 7 days, 30 days, This month, Custom), and nothing else.
// Picks are a draft until Apply dates; ×, Escape or a tap outside close it
// without changing anything. Like the other popups, it's the browser's own
// <dialog>.
export function SummaryDatesDialog({
  isOpen,
  dates,
  day,
  today,
  onApply,
  onClose,
}: SummaryDatesDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

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

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={onClose}
      // A tap on the dark area around the popup closes it, like ×.
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto overscroll-contain rounded-3xl bg-white p-0 text-espresso-950 shadow-[0_24px_64px_-16px_rgb(42_24_16/0.45)] transition-[opacity,translate] duration-300 ease-out-expo [scrollbar-color:var(--color-latte-300)_transparent] backdrop:bg-espresso-950/40 motion-reduce:transition-none starting:open:translate-y-4 starting:open:opacity-0"
    >
      <div ref={contentRef} tabIndex={-1} className="outline-none">
        {/* Only drawn while open, so every time it opens it starts from the
            dates shown, not from picks that were never applied. */}
        {isOpen && (
          <DatesForm
            titleId={titleId}
            initialDates={dates}
            day={day}
            today={today}
            onCancel={close}
            onApply={(nextDates) => {
              onApply(nextDates);
              close();
            }}
          />
        )}
      </div>
    </dialog>
  );
}

type DatesFormProps = {
  titleId: string;
  initialDates: DateChoice;
  day: string;
  today: string;
  onCancel: () => void;
  onApply: (dates: DateChoice) => void;
};

function DatesForm({ titleId, initialDates, day, today, onCancel, onApply }: DatesFormProps) {
  // The picks so far. Nothing changes on the page until Apply dates.
  const [draft, setDraft] = useState(initialDates);
  const days = filterDays(draft, today, day);
  // Only Custom can go past the limit: the other choices are a month at most.
  const length = dayCount(days.from, days.to);
  const isTooLong = length > MAX_SUMMARY_DAYS;

  return (
    // A form, so Enter applies too.
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (!isTooLong) onApply(draft);
      }}
    >
      <div className="flex items-center gap-4 px-5 pt-5 sm:px-7 sm:pt-6">
        <h2 id={titleId} className="flex-1 text-2xl font-semibold tracking-tight">
          Dates
        </h2>
        <button
          type="button"
          aria-label="Close without applying"
          onClick={onCancel}
          className="-mr-2 flex size-11 shrink-0 items-center justify-center rounded-xl text-roast-500 transition-colors duration-200 outline-none hover:bg-latte-100 hover:text-espresso-900 focus-visible:ring-2 focus-visible:ring-espresso-700 active:bg-latte-200"
        >
          <PiX aria-hidden className="size-6" />
        </button>
      </div>

      <div className="p-5 sm:px-7">
        <DatesField
          // The popup is already called "Dates".
          title="Show the summary for"
          name="summary-range"
          value={draft}
          onChange={setDraft}
          day={day}
          today={today}
        />
        {/* Red: something to fix before applying. role="alert" reads it out
            as soon as it appears. */}
        {isTooLong && (
          <p role="alert" className="mt-3 text-sm leading-snug font-medium text-red-800">
            Pick up to {MAX_SUMMARY_DAYS} days (about 3 months). These dates are {length} days.
          </p>
        )}
      </div>

      <div className="sticky bottom-0 z-10 border-t border-latte-200 bg-milk px-5 py-4 sm:px-7">
        <button
          type="submit"
          disabled={isTooLong}
          className="flex h-14 w-full items-center justify-center rounded-2xl bg-espresso-700 text-lg font-semibold text-milk transition-colors duration-200 outline-none hover:bg-espresso-800 focus-visible:ring-2 focus-visible:ring-espresso-700 focus-visible:ring-offset-2 focus-visible:ring-offset-milk active:bg-espresso-900 disabled:cursor-not-allowed disabled:bg-latte-200 disabled:text-roast-400"
        >
          Apply dates
        </button>
      </div>
    </form>
  );
}
