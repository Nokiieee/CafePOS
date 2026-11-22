"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { PiCaretRightBold, PiX } from "react-icons/pi";

type ShowAllProps = {
  /** The button's words: "Show all 23 items". */
  label: string;
  /** The popup's title, like the card's: "Items sold". */
  title: string;
  /** Under the title: the dates and the count, like "Nov 16 – Nov 22 · 23 items". */
  subtitle: string;
  /** The full list, drawn on the server and passed in. */
  children: ReactNode;
};

// The bottom of a summary card that only shows its first few rows: a
// full-width "Show all" button that opens the whole list in a popup, so the
// page itself stays short. Like the other popups, it's the browser's own
// <dialog>; ×, Escape or a tap outside close it.
export function ShowAll({ label, title, subtitle, children }: ShowAllProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (isOpen && dialog && !dialog.open) {
      dialog.showModal();
      // As in the other popups: focus the content, so Safari draws no focus
      // ring on the close button.
      contentRef.current?.focus();
    }
  }, [isOpen]);

  return (
    <>
      {/* Runs to the card's edges (the negative margins undo its padding),
          with a line above, like a footer of the card. */}
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => setIsOpen(true)}
        className="-mx-5 mt-2 -mb-5 flex h-12 w-[calc(100%+2.5rem)] items-center justify-center gap-1.5 rounded-b-3xl border-t border-latte-200 font-semibold text-espresso-800 transition-colors duration-200 outline-none hover:bg-latte-100 focus-visible:ring-2 focus-visible:ring-espresso-700 focus-visible:ring-inset active:bg-latte-200 sm:-mx-6 sm:w-[calc(100%+3rem)]"
      >
        {label}
        <PiCaretRightBold aria-hidden className="size-3.5" />
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        onClose={() => setIsOpen(false)}
        // A tap on the dark area around the popup closes it, like ×.
        onClick={(event) => {
          if (event.target === event.currentTarget) dialogRef.current?.close();
        }}
        // A column only while open (a closed <dialog> must stay hidden): the
        // head stays put and the list scrolls under it. The popup has no set
        // height, only a max, so it's as tall as the list, up to the screen.
        className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-hidden rounded-3xl bg-white p-0 text-espresso-950 shadow-[0_24px_64px_-16px_rgb(42_24_16/0.45)] transition-[opacity,translate] duration-300 ease-out-expo backdrop:bg-espresso-950/40 open:flex open:flex-col motion-reduce:transition-none starting:open:translate-y-4 starting:open:opacity-0"
      >
        <div className="flex items-start gap-4 px-5 pt-5 pb-3 sm:px-7 sm:pt-6">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-2xl font-semibold tracking-tight">
              {title}
            </h2>
            <p className="mt-1 text-roast-500 tabular-nums">{subtitle}</p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={() => dialogRef.current?.close()}
            className="-mt-1 -mr-2 flex size-11 shrink-0 items-center justify-center rounded-xl text-roast-500 transition-colors duration-200 outline-none hover:bg-latte-100 hover:text-espresso-900 focus-visible:ring-2 focus-visible:ring-espresso-700 active:bg-latte-200"
          >
            <PiX aria-hidden className="size-6" />
          </button>
        </div>

        {/* No flex-1 here: it means "start at 0% tall", and with no set
            height to take 0% of, iOS Safari (WebKit) kept the list at 0 and
            showed only the column titles. Starting from the list's own
            height works everywhere; min-h-0 lets it shrink and scroll once
            the popup reaches its max. */}
        <div
          ref={contentRef}
          tabIndex={-1}
          className="min-h-0 overflow-y-auto overscroll-contain px-5 pb-5 outline-none [scrollbar-color:var(--color-latte-300)_transparent] sm:px-7 sm:pb-6"
        >
          {/* Only drawn while open: a long list costs nothing until it's asked for. */}
          {isOpen && children}
        </div>
      </dialog>
    </>
  );
}
