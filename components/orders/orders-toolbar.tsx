"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { PiSlidersHorizontal } from "react-icons/pi";
import {
  activeFilterCount,
  DEFAULT_FILTERS,
  ordersSearchUrl,
  type OrderFilters,
} from "@/lib/order-search";
import { OrderFiltersDialog } from "./order-filters";
import { OrderSearchBox } from "./order-search";
import { RangeButton } from "./range-button";

type OrdersToolbarProps = {
  /** The day picker, shown while the Dates filter is the one day. */
  dayPicker: ReactNode;
  /** The day the page shows (?date=, or today). */
  day: string;
  today: string;
  /** The search text in the address, or "". */
  searchText: string;
  filters: OrderFilters;
  /** Cashiers who worked lately, for the Cashier filter. */
  cashiers: string[];
};

// The Orders toolbar: one row with the day control on the left, the search box
// filling the middle and Filters on the right. The row wraps on narrow
// screens. Filters opens a popup; its picks apply when Apply filters is tapped.
//
// Search and filters both live in the address (see ordersSearchUrl), so a
// search or an applied filter is a navigation, and the page searches on the
// server.
export function OrdersToolbar({
  dayPicker,
  day,
  today,
  searchText,
  filters,
  cashiers,
}: OrdersToolbarProps) {
  const router = useRouter();
  // isPending stays true until the new results have arrived.
  const [isPending, startTransition] = useTransition();
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const count = activeFilterCount(filters);
  // A range of days (7 days, 30 days...) instead of the one day.
  const isRange = filters.range !== "day";

  function search(text: string, nextFilters: OrderFilters) {
    // A range has no single day, so leaving one comes back to today.
    const url = ordersSearchUrl(text, nextFilters, isRange ? today : day, today);
    // Applying the same filters again changes nothing, so don't search again.
    if (url === ordersSearchUrl(searchText, filters, day, today)) return;
    startTransition(() => router.push(url));
  }

  function submitSearch(text: string) {
    // A new search from the one-day view looks at the last 7 days (the
    // user's choice), and the Dates filter then shows "7 days", so the popup
    // always matches the page.
    const isNewSearch = !searchText && text.trim() !== "" && !isRange;
    search(text, isNewSearch ? { ...filters, range: "7d" } : filters);
  }

  function openFilters() {
    setIsFiltersOpen(true);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        {isRange ? (
          // In results, the days searched take the day picker's place.
          // Tapping them opens the filters, where the dates are picked.
          <RangeButton dates={filters} today={today} onClick={openFilters} />
        ) : (
          dayPicker
        )}

        {/* Search and Filters stay together: when the row runs out of room
            (iPad portrait), they move down as a pair and share a full-width
            line, instead of Filters wrapping onto a line by itself. */}
        <div className="flex min-w-[min(24rem,100%)] flex-1 items-center gap-3">
          {/* key: going Back or Forward to another search refills the box. */}
          <OrderSearchBox
            key={searchText}
            initialText={searchText}
            isPending={isPending}
            isSearching={searchText !== "" || count > 0}
            onSearch={submitSearch}
            // Clears the text and every filter, staying on the day shown.
            onClear={() => search("", DEFAULT_FILTERS)}
          />

          <button
            type="button"
            aria-haspopup="dialog"
            onClick={openFilters}
            className="flex h-12 shrink-0 items-center gap-2 rounded-2xl bg-white px-4 font-medium text-espresso-800 ring-1 ring-latte-300 transition-colors duration-200 outline-none hover:bg-latte-100 focus-visible:ring-2 focus-visible:ring-espresso-700 active:bg-latte-200"
          >
            <PiSlidersHorizontal aria-hidden className="size-5" />
            Filters
            {count > 0 && (
              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-espresso-700 px-1.5 text-xs font-semibold text-milk tabular-nums">
                <span className="sr-only">(</span>
                {count}
                <span className="sr-only"> on)</span>
              </span>
            )}
          </button>
        </div>
      </div>

      <OrderFiltersDialog
        isOpen={isFiltersOpen}
        filters={filters}
        cashiers={cashiers}
        day={isRange ? today : day}
        today={today}
        onApply={(nextFilters) => search(searchText, nextFilters)}
        onClose={() => setIsFiltersOpen(false)}
      />
    </div>
  );
}
