"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { PiCaretDown, PiSignOut, PiSpinnerGap, PiUserFill } from "react-icons/pi";
import { logout } from "@/actions/auth";
import type { Role } from "@/lib/auth";

const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  cashier: "Cashier",
};

type AccountMenuProps = {
  name: string;
  role: Role;
};

export function AccountMenu({ name, role }: AccountMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  // Runs logout() for the Sign out form. isSigningOut stays true until the
  // login page has loaded (logout ends by going there), so the whole menu
  // knows a sign-out is on its way, not just the button.
  const [, signOut, isSigningOut] = useActionState(logout, undefined);

  // While the menu is open, close it on a tap outside or the Escape key.
  // Not while signing out: the menu stays open so "Signing out…" stays in
  // view until the login page appears.
  useEffect(() => {
    if (!open || isSigningOut) return;

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
  }, [open, isSigningOut]);

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => {
          // The name button can't close the menu while signing out either.
          if (!isSigningOut) setOpen((isOpen) => !isOpen);
        }}
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
          // z-30: above everything on the page, including the full-screen
          // receipt and bill on phones (z-20). Popups use the browser's top
          // layer, so they still cover it.
          className="absolute top-full left-0 z-30 mt-2 w-48 sm:right-0 sm:left-auto rounded-2xl bg-white p-1.5 shadow-[0_12px_32px_-12px_rgb(61_36_25/0.35)] ring-1 ring-latte-200"
        >
          {/* Who is signed in. The full name here, since the button may cut it short. */}
          <div className="px-3 pt-2 pb-2.5">
            <p className="font-semibold wrap-break-word text-espresso-900">{name}</p>
            <p className="text-sm text-roast-500">{ROLE_LABELS[role]}</p>
          </div>
          <hr className="mx-1.5 mb-1.5 border-latte-200" />

          <form action={signOut}>
            {/* While signing out: a spinner in place of the door, and
                disabled so a second tap can't sign out twice. It keeps its
                light highlight (no faded disabled look), like Signing in…. */}
            <button
              type="submit"
              disabled={isSigningOut}
              className={`flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left font-medium text-espresso-900 transition-colors duration-200 outline-none focus-visible:bg-latte-100 focus-visible:ring-2 focus-visible:ring-espresso-700 ${
                isSigningOut ? "cursor-wait bg-latte-100" : "hover:bg-latte-100 active:bg-latte-200"
              }`}
            >
              {isSigningOut ? (
                <>
                  <PiSpinnerGap aria-hidden className="size-5 animate-spin motion-reduce:animate-none" />
                  Signing out…
                </>
              ) : (
                <>
                  <PiSignOut aria-hidden className="size-5" />
                  Sign out
                </>
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
