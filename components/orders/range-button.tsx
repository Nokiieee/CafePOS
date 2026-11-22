"use client";

import { PiCalendarBlank, PiSpinnerGap } from "react-icons/pi";
import { formatCafeDayShort } from "@/lib/cafe-time";
import { filterDays, rangeLabel, type DateChoice } from "@/lib/date-range";

type RangeButtonProps = {
  /** A range (not the one day). */
  dates: DateChoice;
  today: string;
  /** True while the page loads the dates just picked: a spinner replaces the calendar. */
  isPending?: boolean;
  /** Opens the popup where the dates are picked. */
  onClick: () => void;
};

// Shown in the day picker's place when the page covers a range of days, on
// Orders and Summary: "Last 7 days  Nov 16 – Nov 22". Tapping it opens the
// popup where the dates are picked.
export function RangeButton({ dates, today, isPending = false, onClick }: RangeButtonProps) {
  const days = filterDays(dates, today);

  return (
    <button
      type="button"
      aria-haspopup="dialog"
      onClick={onClick}
      className="flex h-12 shrink-0 items-center gap-2 rounded-2xl bg-white px-4 whitespace-nowrap ring-1 ring-latte-300 transition-colors duration-200 outline-none hover:bg-latte-100 focus-visible:ring-2 focus-visible:ring-espresso-700 active:bg-latte-200"
    >
      {isPending ? (
        <PiSpinnerGap
          aria-label="Loading"
          className="size-5 animate-spin text-espresso-700 motion-reduce:animate-none"
        />
      ) : (
        <PiCalendarBlank aria-hidden className="size-5 text-espresso-700" />
      )}
      <span className="font-semibold text-espresso-950">{rangeLabel(dates)}</span>
      <span className="text-roast-500 tabular-nums">
        {formatCafeDayShort(days.from)} – {formatCafeDayShort(days.to)}
      </span>
    </button>
  );
}
