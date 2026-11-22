"use client";

import { useEffect, useId, useRef, useState } from "react";
import { PiCaretDown, PiX } from "react-icons/pi";
import { OptionGroup, SegmentedControl } from "@/components/pos/option-controls";
import {
  activeFilterCount,
  DEFAULT_FILTERS,
  ORDER_TYPE_FILTERS,
  VOIDED_FILTERS,
  type OrderFilters,
} from "@/lib/order-search";
import { DatesField } from "./dates-field";

type OrderFiltersDialogProps = {
  isOpen: boolean;
  /** The filters in use now; the popup starts from these each time it opens. */
  filters: OrderFilters;
  /** Cashiers who worked lately, A to Z. */
  cashiers: string[];
  /** The day the page shows: the Dates filter's first choice. */
  day: string;
  today: string;
  /** Apply filters was tapped: search with these. */
  onApply: (filters: OrderFilters) => void;
  /** Called after the popup closes, however it was closed. */
  onClose: () => void;
};

// The Filters popup on Orders. Picks are only a draft until Apply filters:
// that closes the popup and searches once. ×, Escape or a tap outside close
// it without changing anything. Like the other popups, it's the browser's
// own <dialog>.
export function OrderFiltersDialog({
  isOpen,
  filters,
  cashiers,
  day,
  today,
  onApply,
  onClose,
}: OrderFiltersDialogProps) {
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
            filters in use, not from picks that were never applied. */}
        {isOpen && (
          <FiltersForm
            titleId={titleId}
            initialFilters={filters}
            cashiers={cashiers}
            day={day}
            today={today}
            onCancel={close}
            onApply={(nextFilters) => {
              onApply(nextFilters);
              close();
            }}
          />
        )}
      </div>
    </dialog>
  );
}

type FiltersFormProps = {
  titleId: string;
  initialFilters: OrderFilters;
  cashiers: string[];
  day: string;
  today: string;
  onCancel: () => void;
  onApply: (filters: OrderFilters) => void;
};

function FiltersForm({
  titleId,
  initialFilters,
  cashiers,
  day,
  today,
  onCancel,
  onApply,
}: FiltersFormProps) {
  // The picks so far. Nothing changes on the page until Apply filters.
  const [draft, setDraft] = useState(initialFilters);

  function set(changes: Partial<OrderFilters>) {
    setDraft((current) => ({ ...current, ...changes }));
  }

  return (
    // A form, so Enter applies too.
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onApply(draft);
      }}
    >
      <div className="flex items-center gap-4 px-5 pt-5 sm:px-7 sm:pt-6">
        <h2 id={titleId} className="flex-1 text-2xl font-semibold tracking-tight">
          Filters
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

      <div className="space-y-6 p-5 sm:px-7">
        <DatesField
          name="filter-range"
          value={draft}
          onChange={(dates) => set(dates)}
          day={day}
          today={today}
        />

        <CashierField
          cashiers={cashiers}
          value={draft.cashier}
          onChange={(cashier) => set({ cashier })}
        />

        <OptionGroup
          title="Order type"
          value={ORDER_TYPE_FILTERS.find((option) => option.value === draft.orderType)?.label ?? ""}
        >
          <SegmentedControl
            name="filter-type"
            value={draft.orderType}
            options={ORDER_TYPE_FILTERS}
            onChange={(orderType) => set({ orderType })}
          />
        </OptionGroup>

        <OptionGroup
          title="Voided"
          value={VOIDED_FILTERS.find((option) => option.value === draft.voided)?.label ?? ""}
        >
          <SegmentedControl
            name="filter-voided"
            value={draft.voided}
            options={VOIDED_FILTERS}
            onChange={(voided) => set({ voided })}
          />
        </OptionGroup>
      </div>

      <div className="sticky bottom-0 z-10 flex items-center gap-3 border-t border-latte-200 bg-milk px-5 py-4 sm:px-7">
        {/* Resets the picks here; Apply filters then saves that. */}
        {activeFilterCount(draft) > 0 && (
          <button
            type="button"
            onClick={() => setDraft(DEFAULT_FILTERS)}
            className="h-14 shrink-0 rounded-2xl px-4 font-medium text-roast-500 transition-colors duration-200 outline-none hover:bg-latte-100 hover:text-espresso-900 focus-visible:ring-2 focus-visible:ring-espresso-700 active:bg-latte-200"
          >
            Clear filters
          </button>
        )}
        <button
          type="submit"
          className="flex h-14 flex-1 items-center justify-center rounded-2xl bg-espresso-700 text-lg font-semibold text-milk transition-colors duration-200 outline-none hover:bg-espresso-800 focus-visible:ring-2 focus-visible:ring-espresso-700 focus-visible:ring-offset-2 focus-visible:ring-offset-milk active:bg-espresso-900"
        >
          Apply filters
        </button>
      </div>
    </form>
  );
}

type CashierFieldProps = {
  cashiers: string[];
  value: string | null;
  onChange: (cashier: string | null) => void;
};

// A native list: the iPad opens its own picker for it, which is easy to use
// with a finger and fits any number of names.
function CashierField({ cashiers, value, onChange }: CashierFieldProps) {
  const selectId = useId();
  // A cashier picked from an old link may not have worked lately: keep them listed.
  const names = value && !cashiers.includes(value) ? [value, ...cashiers] : cashiers;

  return (
    <div>
      <label htmlFor={selectId} className="mb-2.5 block text-sm font-semibold text-espresso-900">
        Cashier
      </label>
      <div className="relative">
        <select
          id={selectId}
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value || null)}
          // 52px, the same height as the choice tracks around it.
          className="h-13 w-full cursor-pointer appearance-none rounded-2xl border border-latte-300 bg-white pr-11 pl-4 font-medium text-espresso-950 transition-[border-color,box-shadow] duration-200 outline-none hover:border-roast-400 focus:border-espresso-700 focus:ring-2 focus:ring-espresso-700/20"
        >
          <option value="">Everyone</option>
          {names.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <PiCaretDown
          aria-hidden
          className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-roast-500"
        />
      </div>
    </div>
  );
}
