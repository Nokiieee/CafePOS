"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { PiCalendarBlank, PiSlidersHorizontal } from "react-icons/pi";
import { formatCafeDayShort } from "@/lib/cafe-time";
import {
  activeFilterCount,
  DEFAULT_FILTERS,
  filterDays,
  ordersSearchUrl,
  rangeLabel,
  type OrderFilters,
} from "@/lib/order-search";
import { OrderFiltersDialog } from "./order-filters";
import { OrderSearchBox } from "./order-search";

type OrdersToolbarProps = {
  /** The day picker, shown in the normal day view. */
  dayPicker: ReactNode;
  /** Search text or filters are on: the page shows results instead of one day. */
  isSearching: boolean;
  /** The search text in the address, or "". */
  searchText: string;
  filters: OrderFilters;
  /** Cashiers who worked lately, for the Cashier filter. */
  cashiers: string[];
  today: string;
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
  isSearching,
  searchText,
  filters,
  cashiers,
  today,
}: OrdersToolbarProps) {
  const router = useRouter();
  // isPending stays true until the new results have arrived.
  const [isPending, startTransition] = useTransition();
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const count = activeFilterCount(filters);
  const days = filterDays(filters, today);

  function search(text: string, nextFilters: OrderFilters) {
    const url = ordersSearchUrl(text, nextFilters);
    // Applying the same filters again changes nothing, so don't search again.
    if (url === ordersSearchUrl(searchText, filters)) return;
    startTransition(() => router.push(url));
  }

  function openFilters() {
    setIsFiltersOpen(true);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        {isSearching ? (
          // In results, the days searched take the day picker's place.
          // Tapping them opens the filters, where the dates are picked.
          <button
            type="button"
            aria-haspopup="dialog"
            onClick={openFilters}
            className="flex h-12 shrink-0 items-center gap-2 rounded-2xl bg-white px-4 whitespace-nowrap ring-1 ring-latte-300 transition-colors duration-200 outline-none hover:bg-latte-100 focus-visible:ring-2 focus-visible:ring-espresso-700 active:bg-latte-200"
          >
            <PiCalendarBlank aria-hidden className="size-5 text-espresso-700" />
            <span className="font-semibold text-espresso-950">{rangeLabel(filters)}</span>
            <span className="text-roast-500 tabular-nums">
              {formatCafeDayShort(days.from)} – {formatCafeDayShort(days.to)}
            </span>
          </button>
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
            isSearching={isSearching}
            onSearch={(text) => search(text, filters)}
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
        today={today}
        onApply={(nextFilters) => search(searchText, nextFilters)}
        onClose={() => setIsFiltersOpen(false)}
      />
    </div>
  );
}
