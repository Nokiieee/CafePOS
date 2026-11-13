"use client";

import { useRouter } from "next/navigation";
import { useTransition, type ReactNode } from "react";
import {
  PiCalendarBlank,
  PiCaretLeftBold,
  PiCaretRightBold,
  PiSpinnerGap,
} from "react-icons/pi";
import { formatCafeDay, isCafeDay, shiftCafeDay } from "@/lib/cafe-time";

type DayPickerProps = {
  /** The day being shown, like "2026-11-13". */
  day: string;
  /** Today at the cafe. Later days can't be picked: they have no orders yet. */
  today: string;
};

// Previous day, the day itself (tap it to pick from a calendar), next day,
// and a jump back to Today. Picking a day changes the URL (?date=...), and
// the page loads that day's orders on the server.
export function DayPicker({ day, today }: DayPickerProps) {
  const router = useRouter();
  // isPending stays true until the new day's orders have arrived.
  const [isPending, startTransition] = useTransition();
  const isToday = day === today;

  function goTo(nextDay: string) {
    if (!isCafeDay(nextDay) || nextDay > today || nextDay === day) return;
    // Today has a clean URL with no ?date=.
    const url = nextDay === today ? "/dashboard/orders" : `/dashboard/orders?date=${nextDay}`;
    startTransition(() => router.push(url));
  }

  return (
    <div className="flex flex-wrap items-center gap-2" aria-busy={isPending}>
      <StepButton label="Previous day" onClick={() => goTo(shiftCafeDay(day, -1))}>
        <PiCaretLeftBold aria-hidden className="size-4" />
      </StepButton>

      {/* The visible part is just a label. An invisible date field covers it,
          so a tap lands on the field: iPad Safari then opens its calendar.
          Desktop browsers only open it from a small icon, so showPicker()
          opens it on any click. */}
      <label className="relative flex h-11 cursor-pointer items-center gap-2 rounded-xl bg-white px-4 font-semibold text-espresso-950 ring-1 ring-latte-300 transition-colors duration-200 select-none has-focus-visible:ring-2 has-focus-visible:ring-espresso-700 hover:bg-latte-100">
        <PiCalendarBlank aria-hidden className="size-5 text-espresso-700" />
        <span>
          {isToday && <span className="text-espresso-700">Today · </span>}
          {formatCafeDay(day)}
        </span>
        <input
          type="date"
          aria-label="Pick a day"
          value={day}
          max={today}
          onClick={(event) => {
            try {
              event.currentTarget.showPicker();
            } catch {
              // Not supported here; the browser's own tap handling still works.
            }
          }}
          // Clearing the field gives "", which goTo ignores.
          onChange={(event) => goTo(event.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </label>

      <StepButton label="Next day" disabled={isToday} onClick={() => goTo(shiftCafeDay(day, 1))}>
        <PiCaretRightBold aria-hidden className="size-4" />
      </StepButton>

      <button
        type="button"
        disabled={isToday}
        onClick={() => goTo(today)}
        className="h-11 rounded-xl px-4 font-medium text-espresso-800 transition-colors duration-200 outline-none hover:bg-latte-100 focus-visible:ring-2 focus-visible:ring-espresso-700 active:bg-latte-200 disabled:cursor-default disabled:text-roast-400 disabled:hover:bg-transparent"
      >
        Today
      </button>

      {isPending && (
        <PiSpinnerGap
          aria-label="Loading orders"
          className="size-5 animate-spin text-roast-500 motion-reduce:animate-none"
        />
      )}
    </div>
  );
}

type StepButtonProps = {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
};

function StepButton({ label, disabled, onClick, children }: StepButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-11 items-center justify-center rounded-xl bg-white text-espresso-800 ring-1 ring-latte-300 transition-colors duration-200 outline-none hover:bg-latte-100 focus-visible:ring-2 focus-visible:ring-espresso-700 active:bg-latte-200 disabled:cursor-default disabled:text-roast-400 disabled:ring-latte-200 disabled:hover:bg-white"
    >
      {children}
    </button>
  );
}
