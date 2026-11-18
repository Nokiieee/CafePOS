"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition, type ReactNode } from "react";
import {
  PiCalendarBlank,
  PiCaretLeftBold,
  PiCaretRightBold,
  PiSpinnerGap,
} from "react-icons/pi";
import { formatCafeDay, isCafeDay, shiftCafeDay } from "@/lib/cafe-time";

type DayPickerProps = {
  /** The page it changes the day of: Orders or Summary. */
  basePath: "/dashboard/orders" | "/dashboard/summary";
  /** The day being shown, like "2026-11-13". */
  day: string;
  /** Today at the cafe. Later days can't be picked: they have no orders yet. */
  today: string;
};

// Previous day, the day itself (tap it to pick from a calendar), next day,
// and, on other days, a jump back to Today. Picking a day changes the URL
// (?date=...), and the page loads that day's orders on the server.
export function DayPicker({ basePath, day, today }: DayPickerProps) {
  const router = useRouter();
  // The address as it is now. Only ?date= changes, so search text and filters
  // on Orders (?voided=only...) stay on while stepping through days. Reading
  // it needs Suspense (Cache Components rule); both pages render the picker
  // inside their Suspense content.
  const searchParams = useSearchParams();
  // isPending stays true until the new day's orders have arrived.
  const [isPending, startTransition] = useTransition();
  const isToday = day === today;

  function goTo(nextDay: string) {
    if (!isCafeDay(nextDay) || nextDay > today || nextDay === day) return;
    const params = new URLSearchParams(searchParams.toString());
    // Today has a clean URL with no ?date=.
    if (nextDay === today) {
      params.delete("date");
    } else {
      params.set("date", nextDay);
    }
    const query = params.toString();
    startTransition(() => router.push(query ? `${basePath}?${query}` : basePath));
  }

  // One control in a single white frame, split into segments: ‹ | date | › | Today.
  // overflow-hidden keeps each segment's hover fill inside the rounded frame;
  // focus rings are drawn inset for the same reason.
  return (
    <div
      aria-busy={isPending}
      className="flex h-12 shrink-0 items-stretch overflow-hidden rounded-2xl bg-white ring-1 ring-latte-300"
    >
      <StepButton label="Previous day" onClick={() => goTo(shiftCafeDay(day, -1))}>
        <PiCaretLeftBold aria-hidden className="size-4" />
      </StepButton>

      {/* The visible part is just a label. An invisible date field covers it,
          so a tap lands on the field: iPad Safari then opens its calendar.
          Desktop browsers only open it from a small icon, so showPicker()
          opens it on any click. */}
      <label
        // On today the date is the last segment, so it takes the frame's full
        // 16px on the right, like the Today button does on other days.
        className={`relative flex cursor-pointer items-center gap-2 pl-3 font-semibold whitespace-nowrap ${isToday ? "pr-4" : "pr-3"} text-espresso-950 transition-colors duration-200 select-none hover:bg-latte-100 has-focus-visible:ring-2 has-focus-visible:ring-espresso-700 has-focus-visible:ring-inset`}
      >
        {/* While the new day loads, a spinner takes the calendar's place. */}
        {isPending ? (
          <PiSpinnerGap
            aria-label="Loading"
            className="size-5 animate-spin text-roast-500 motion-reduce:animate-none"
          />
        ) : (
          <PiCalendarBlank aria-hidden className="size-5 text-espresso-700" />
        )}
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

      {/* Only on other days: there's no day after today, and on today the
          label already says "Today". */}
      {!isToday && (
        <>
          <StepButton label="Next day" onClick={() => goTo(shiftCafeDay(day, 1))}>
            <PiCaretRightBold aria-hidden className="size-4" />
          </StepButton>
          {/* A thin divider sets Today apart from the arrows. */}
          <span aria-hidden className="my-3 w-px bg-latte-200" />
          <button
            type="button"
            onClick={() => goTo(today)}
            className="px-4 font-medium text-espresso-800 transition-colors duration-200 outline-none hover:bg-latte-100 focus-visible:ring-2 focus-visible:ring-espresso-700 focus-visible:ring-inset active:bg-latte-200"
          >
            Today
          </button>
        </>
      )}
    </div>
  );
}

type StepButtonProps = {
  label: string;
  onClick: () => void;
  children: ReactNode;
};

function StepButton({ label, onClick, children }: StepButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex w-12 shrink-0 items-center justify-center text-espresso-800 transition-colors duration-200 outline-none hover:bg-latte-100 focus-visible:ring-2 focus-visible:ring-espresso-700 focus-visible:ring-inset active:bg-latte-200"
    >
      {children}
    </button>
  );
}
