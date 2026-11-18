"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { PiMagnifyingGlass, PiSpinnerGap, PiX } from "react-icons/pi";
import { MAX_QUERY_LENGTH } from "@/lib/order-search";

type OrderSearchBoxProps = {
  /** The search in the address (?q=), or "" for the normal day view. */
  initialText: string;
};

// The search box at the top of Orders. It searches when Enter (or the iPad
// keyboard's Search key) is pressed, not on every letter, so typing stays
// smooth and Supabase isn't asked over and over.
//
// The search goes into the address (?q=latte), and the page searches on the
// server. So Back, refreshing and bookmarks all keep it.
export function OrderSearchBox({ initialText }: OrderSearchBoxProps) {
  const router = useRouter();
  const inputId = useId();
  const [text, setText] = useState(initialText);
  // isPending stays true until the results have arrived.
  const [isPending, startTransition] = useTransition();

  function search(value: string) {
    const trimmed = value.trim();
    // Empty: back to the normal day view, with the clean address.
    const url = trimmed ? `/dashboard/orders?q=${encodeURIComponent(trimmed)}` : "/dashboard/orders";
    startTransition(() => router.push(url));
  }

  function clear() {
    setText("");
    // Only leave the results if a search is showing; otherwise just empty the box.
    if (initialText) search("");
  }

  return (
    <form
      role="search"
      aria-busy={isPending}
      onSubmit={(event) => {
        event.preventDefault();
        search(text);
      }}
      // Fills the rest of the toolbar row beside the day picker; when the row
      // gets too narrow (iPad portrait, phones) it wraps to a full-width line.
      className="relative min-w-64 flex-1"
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
        // The same soft latte edge as the day picker beside it, so the two read
        // as one toolbar; it darkens on hover and turns espresso on focus.
        className="h-12 w-full appearance-none rounded-2xl border border-latte-300 bg-white pr-12 pl-12 text-espresso-950 caret-espresso-700 transition-[border-color,box-shadow] duration-200 outline-none placeholder:text-roast-500 hover:border-roast-400 focus:border-espresso-700 focus:ring-2 focus:ring-espresso-700/20 [&::-webkit-search-cancel-button]:hidden"
      />
      <div className="absolute top-1/2 right-1.5 -translate-y-1/2">
        {isPending ? (
          <PiSpinnerGap
            aria-label="Searching"
            className="m-2 size-5 animate-spin text-roast-500 motion-reduce:animate-none"
          />
        ) : (
          (text || initialText) && (
            <button
              type="button"
              aria-label="Clear search"
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
