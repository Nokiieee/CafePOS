"use client";

import { useEffect, useId, useRef, useState } from "react";
import { PiCaretDown, PiSignOut, PiUserFill } from "react-icons/pi";
import { logout } from "@/actions/auth";

type AccountMenuProps = {
  name: string;
};

export function AccountMenu({ name }: AccountMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  // While the menu is open, close it on a tap outside or the Escape key.
  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    // Cleanup: remove the listeners when the menu closes.
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((isOpen) => !isOpen)}
        className="flex h-11 max-w-full items-center gap-2.5 rounded-xl bg-espresso-700/80 px-4 text-milk border border-white/20 shadow-[inset_0_1px_0_rgb(255_255_255/0.25)] backdrop-blur-md transition-colors duration-200 outline-none hover:bg-espresso-800/85 focus-visible:ring-2 focus-visible:ring-espresso-700 focus-visible:ring-offset-2 focus-visible:ring-offset-milk active:bg-espresso-900/90"
      >
        <PiUserFill aria-hidden className="size-5 shrink-0" />
        <span className="truncate text-xl font-semibold">{name}</span>
        <PiCaretDown
          aria-hidden
          className={`size-4 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          id={menuId}
          className="absolute top-full left-0 z-10 mt-2 w-48 sm:right-0 sm:left-auto rounded-2xl bg-white p-1.5 shadow-[0_12px_32px_-12px_rgb(61_36_25/0.35)] ring-1 ring-latte-200"
        >
          <form action={logout}>
            <button
              type="submit"
              className="flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left font-medium text-espresso-900 transition-colors duration-200 outline-none hover:bg-latte-100 focus-visible:bg-latte-100 focus-visible:ring-2 focus-visible:ring-espresso-700 active:bg-latte-200"
            >
              <PiSignOut aria-hidden className="size-5" />
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
