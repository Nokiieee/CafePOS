"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { PiCalendarDots, PiSpinnerGap } from "react-icons/pi";
import { RangeButton } from "@/components/orders/range-button";
import { datesUrl, type DateChoice } from "@/lib/date-range";
import { SummaryDatesDialog } from "./summary-dates-dialog";

type SummaryToolbarProps = {
  /** The day picker, shown while the summary is for one day. */
  dayPicker: ReactNode;
  /** The dates shown (from the address). */
  dates: DateChoice;
  /** The day the page shows (?date=, or today). */
  day: string;
  today: string;
};

// The Summary toolbar. For one day: the day picker, and Dates beside it to
// pick a range. For a range: the range itself ("Last 7 days  Nov 16 – Nov 22")
// takes the day picker's place, and tapping it opens the same popup.
//
// The dates live in the address, like on Orders, so applying them is a
// navigation and the page works out the summary on the server.
export function SummaryToolbar({ dayPicker, dates, day, today }: SummaryToolbarProps) {
  const router = useRouter();
  // isPending stays true until the new summary has arrived.
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  // A range of days (7 days, 30 days...) instead of the one day.
  const isRange = dates.range !== "day";

  function apply(nextDates: DateChoice) {
    // A range has no single day, so leaving one comes back to today.
    const url = datesUrl("/dashboard/summary", nextDates, isRange ? today : day, today);
    // Applying the same dates again changes nothing, so don't load again.
    if (url === datesUrl("/dashboard/summary", dates, day, today)) return;
    startTransition(() => router.push(url));
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {isRange ? (
        <RangeButton
          dates={dates}
          today={today}
          isPending={isPending}
          onClick={() => setIsOpen(true)}
        />
      ) : (
        <>
          {dayPicker}
          <button
            type="button"
            aria-haspopup="dialog"
            onClick={() => setIsOpen(true)}
            className="flex h-12 shrink-0 items-center gap-2 rounded-2xl bg-white px-4 font-medium text-espresso-800 ring-1 ring-latte-300 transition-colors duration-200 outline-none hover:bg-latte-100 focus-visible:ring-2 focus-visible:ring-espresso-700 active:bg-latte-200"
          >
            {isPending ? (
              <PiSpinnerGap
                aria-label="Loading"
                className="size-5 animate-spin motion-reduce:animate-none"
              />
            ) : (
              <PiCalendarDots aria-hidden className="size-5" />
            )}
            Dates
          </button>
        </>
      )}

      <SummaryDatesDialog
        isOpen={isOpen}
        dates={dates}
        // In a range, the first choice is today, as on Orders.
        day={isRange ? today : day}
        today={today}
        onApply={apply}
        onClose={() => setIsOpen(false)}
      />
    </div>
  );
}
