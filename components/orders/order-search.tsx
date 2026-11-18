"use client";

import { useId, useState } from "react";
import { PiMagnifyingGlass, PiSpinnerGap, PiX } from "react-icons/pi";
import { MAX_QUERY_LENGTH } from "@/lib/order-search";

type OrderSearchBoxProps = {
  /** The search text in the address, or "". */
  initialText: string;
  /** True while the results are on their way. */
  isPending: boolean;
  /** Search or filters are on, so × has something to clear. */
  isSearching: boolean;
  /** Enter (or the iPad's Search key) was pressed. */
  onSearch: (text: string) => void;
  /** × was tapped: clear the text and every filter, back to the day view. */
  onClear: () => void;
};

// The search box in the Orders toolbar. It searches when Enter (or the iPad
// keyboard's Search key) is pressed, not on every letter, so typing stays
// smooth and Supabase isn't asked over and over.
export function OrderSearchBox({
  initialText,
  isPending,
  isSearching,
  onSearch,
  onClear,
}: OrderSearchBoxProps) {
  const inputId = useId();
  const [text, setText] = useState(initialText);

  function clear() {
    setText("");
    // Only leave the results if a search is showing; otherwise just empty the box.
    if (isSearching) onClear();
  }

  return (
    <form
      role="search"
      aria-busy={isPending}
      onSubmit={(event) => {
        event.preventDefault();
        onSearch(text);
      }}
      // Fills the space beside the Filters button (the toolbar decides when
      // the pair wraps to a line of its own).
      className="relative min-w-0 flex-1"
    >
      <label htmlFor={inputId} className="sr-only">
        Search orders by item or amount
      </label>
      <PiMagnifyingGlass
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-roast-500"
      />
      {/* type="search" with enterKeyHint gives the iPad keyboard a Search key.
          WebKit's own clear button is hidden: the × below does the same job
          and also leaves the results. */}
      <input
        id={inputId}
        type="search"
        enterKeyHint="search"
        autoComplete="off"
        maxLength={MAX_QUERY_LENGTH}
        placeholder="Search items or an amount"
        value={text}
        onChange={(event) => setText(event.target.value)}
        // The same soft latte edge as the controls beside it, so they read as
        // one toolbar; it darkens on hover and turns espresso on focus.
        className="h-12 w-full appearance-none rounded-2xl border border-latte-300 bg-white pr-12 pl-12 text-espresso-950 caret-espresso-700 transition-[border-color,box-shadow] duration-200 outline-none placeholder:text-roast-500 hover:border-roast-400 focus:border-espresso-700 focus:ring-2 focus:ring-espresso-700/20 [&::-webkit-search-cancel-button]:hidden"
      />
      <div className="absolute top-1/2 right-1.5 -translate-y-1/2">
        {isPending ? (
          <PiSpinnerGap
            aria-label="Searching"
            className="m-2 size-5 animate-spin text-roast-500 motion-reduce:animate-none"
          />
        ) : (
          (text || isSearching) && (
            <button
              type="button"
              aria-label={isSearching ? "Clear search and filters" : "Clear search"}
              onClick={clear}
              className="flex size-9 items-center justify-center rounded-xl text-roast-500 transition-colors duration-200 outline-none hover:bg-latte-100 hover:text-espresso-900 focus-visible:ring-2 focus-visible:ring-espresso-700 active:bg-latte-200"
            >
              <PiX aria-hidden className="size-5" />
            </button>
          )
        )}
      </div>
    </form>
  );
}
