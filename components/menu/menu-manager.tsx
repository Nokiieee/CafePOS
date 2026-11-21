"use client";

import Image from "next/image";
import { useOptimistic, useState, useTransition } from "react";
import { PiPlusBold, PiWarningCircleFill } from "react-icons/pi";
import { setItemOnMenu, type MenuActionResult } from "@/actions/menu";
import { NoPhoto } from "@/components/pos/menu-grid";
import { formatPrice } from "@/lib/format-price";
import type { MenuItem } from "@/lib/menu";
import { MENU_CATEGORIES } from "@/lib/menu-rules";
import { MenuItemDialog } from "./menu-item-dialog";

// Shown when the request never got an answer, e.g. the Wi-Fi dropped.
const NO_CONNECTION_MESSAGE =
  "Couldn't reach the server. Check the internet connection and try again.";

type MenuManagerProps = {
  /** Every item, including those off the menu, in the Register's order. */
  items: MenuItem[];
};

// The Menu page (admins only): every item in one card, by category, each
// with its On the menu switch. Tapping an item opens its edit popup; Add item
// opens the same popup, empty.
export function MenuManager({ items }: MenuManagerProps) {
  // The popup: the item being edited, "new" for Add item, or null when closed.
  const [editing, setEditing] = useState<MenuItem | "new" | null>(null);
  // Why the last switch couldn't be saved.
  const [switchError, setSwitchError] = useState<string | null>(null);
  // A switch moves as soon as it's tapped. If saving fails, it moves back by
  // itself when the save is over (React drops the optimistic change).
  const [shownItems, showSwitched] = useOptimistic(
    items,
    (current, changed: { id: string; isOnMenu: boolean }) =>
      current.map((item) =>
        item.id === changed.id ? { ...item, isOnMenu: changed.isOnMenu } : item,
      ),
  );
  const [, startTransition] = useTransition();

  function switchItem(item: MenuItem) {
    const isOnMenu = !item.isOnMenu;
    setSwitchError(null);

    startTransition(async () => {
      showSwitched({ id: item.id, isOnMenu });

      let result: MenuActionResult | undefined;
      try {
        result = await setItemOnMenu(item.id, isOnMenu);
      } catch {
        // The request itself failed, so there's no result to read.
        result = undefined;
      }
      if (!result?.ok) setSwitchError(result?.message ?? NO_CONNECTION_MESSAGE);
    });
  }

  const offCount = shownItems.filter((item) => !item.isOnMenu).length;

  return (
    <div className="flex flex-col gap-6">
      {/* role="alert" makes screen readers read it out as soon as it appears. */}
      {switchError && (
        <p
          role="alert"
          className="flex items-start gap-2.5 rounded-2xl bg-latte-100 px-4 py-3 text-sm leading-snug font-medium text-espresso-900"
        >
          <PiWarningCircleFill aria-hidden className="size-5 shrink-0 text-espresso-700" />
          {switchError}
        </p>
      )}

      <div className="overflow-hidden rounded-3xl bg-white ring-1 ring-latte-200">
        {/* The card's top band: the counts, and Add item. */}
        <div className="flex items-center justify-between gap-4 border-b border-latte-200 bg-milk py-2.5 pr-2.5 pl-6">
          <p className="text-sm text-roast-500">
            {shownItems.length} {shownItems.length === 1 ? "item" : "items"}
            {offCount > 0 && <> · {offCount} off the menu</>}
          </p>
          <button
            type="button"
            aria-haspopup="dialog"
            onClick={() => setEditing("new")}
            className="flex h-11 shrink-0 items-center gap-2 rounded-xl bg-espresso-700 px-4 font-semibold text-milk transition-colors duration-200 outline-none hover:bg-espresso-800 focus-visible:ring-2 focus-visible:ring-espresso-700 focus-visible:ring-offset-2 focus-visible:ring-offset-milk active:bg-espresso-900"
          >
            <PiPlusBold aria-hidden className="size-4" />
            Add item
          </button>
        </div>

        {MENU_CATEGORIES.map((category, index) => {
          const categoryItems = shownItems.filter((item) => item.categoryId === category.id);
          const headingId = `menu-${category.id}`;

          return (
            <section
              key={category.id}
              aria-labelledby={headingId}
              className={index > 0 ? "border-t border-latte-200" : undefined}
            >
              <div className="flex items-baseline justify-between gap-3 border-b border-latte-200 bg-milk px-6 py-2 text-sm text-roast-500">
                <h2 id={headingId} className="font-semibold">
                  {category.label} · {categoryItems.length}
                </h2>
                {/* The switches' column title. Each switch also says it for
                    screen readers, so this one is skipped by them. */}
                <span aria-hidden>On the menu</span>
              </div>

              {categoryItems.length === 0 ? (
                <p className="px-6 py-4 text-roast-500">Nothing in {category.label} yet.</p>
              ) : (
                <ul className="divide-y divide-latte-200">
                  {categoryItems.map((item) => (
                    <MenuRow
                      key={item.id}
                      item={item}
                      onEdit={() => setEditing(item)}
                      onSwitch={() => switchItem(item)}
                    />
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      <MenuItemDialog item={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

type MenuRowProps = {
  item: MenuItem;
  onEdit: () => void;
  onSwitch: () => void;
};

// One item: the whole row opens its edit popup, and the switch at the right
// sits on top of the row. They're side by side in the page's code, because
// a button can't hold another button.
function MenuRow({ item, onEdit, onSwitch }: MenuRowProps) {
  const isOff = !item.isOnMenu;

  return (
    <li className="relative">
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={onEdit}
        // pr-24 leaves room for the switch. The focus ring is inset, so the
        // card's rounded corners don't clip it.
        className="flex w-full items-center gap-4 py-3 pr-24 pl-6 text-left transition-colors duration-200 outline-none hover:bg-latte-100/60 focus-visible:ring-2 focus-visible:ring-espresso-700 focus-visible:ring-inset active:bg-latte-200"
      >
        <span
          className={`relative size-14 shrink-0 overflow-hidden rounded-xl bg-white ring-1 ring-latte-200 transition-opacity duration-200 ${
            isOff ? "opacity-50" : ""
          }`}
        >
          {item.image ? (
            <Image src={item.image} alt="" fill sizes="56px" className="object-contain" />
          ) : (
            <NoPhoto />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span
              className={`truncate font-medium ${isOff ? "text-roast-500" : "text-espresso-950"}`}
            >
              {item.name}
            </span>
            {isOff && (
              <span className="shrink-0 rounded-md bg-latte-100 px-1.5 py-0.5 text-xs font-semibold text-roast-500">
                Off the menu
              </span>
            )}
          </span>
          {item.description && (
            <span className="mt-0.5 block truncate text-sm text-roast-500">{item.description}</span>
          )}
        </span>
        <span
          className={`shrink-0 font-semibold tabular-nums ${
            isOff ? "text-roast-500" : "text-espresso-700"
          }`}
        >
          {formatPrice(item.price)}
        </span>
      </button>

      <div className="absolute top-1/2 right-4 -translate-y-1/2">
        <OnMenuSwitch name={item.name} isOn={item.isOnMenu} onToggle={onSwitch} />
      </div>
    </li>
  );
}

type OnMenuSwitchProps = {
  name: string;
  isOn: boolean;
  onToggle: () => void;
};

// A switch: espresso with the knob at the right when on, latte when off.
// role="switch" makes screen readers say "on" or "off". The tap area is the
// whole 64 × 44 box, bigger than the track.
function OnMenuSwitch({ name, isOn, onToggle }: OnMenuSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={isOn}
      aria-label={`${name} on the menu`}
      onClick={onToggle}
      className="flex h-11 w-16 items-center justify-center rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-espresso-700"
    >
      <span
        className={`relative h-7 w-12 rounded-full transition-colors duration-200 motion-reduce:transition-none ${
          isOn ? "bg-espresso-700" : "bg-latte-300"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 size-6 rounded-full bg-white shadow-[0_2px_6px_-2px_rgb(61_36_25/0.35)] transition-transform duration-300 ease-out-expo motion-reduce:transition-none ${
            isOn ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </span>
    </button>
  );
}

/** Placeholder shapes while the menu loads: the card, its bands and rows. */
export function MenuListSkeleton() {
  const block = "animate-pulse bg-latte-100 motion-reduce:animate-none";

  return (
    <div
      aria-busy="true"
      aria-label="Loading the menu"
      className="overflow-hidden rounded-3xl bg-white ring-1 ring-latte-200"
    >
      <div className="flex items-center justify-between border-b border-latte-200 bg-milk py-2.5 pr-2.5 pl-6">
        <div className={`h-4 w-40 rounded-md ${block}`} />
        <div className={`h-11 w-32 rounded-xl ${block}`} />
      </div>
      <div className="border-b border-latte-200 bg-milk px-6 py-2.5">
        <div className={`h-4 w-24 rounded-md ${block}`} />
      </div>
      <div className="divide-y divide-latte-200">
        {[0, 1, 2, 3, 4].map((row) => (
          <div key={row} className="flex items-center gap-4 py-3 pr-6 pl-6">
            <div className={`size-14 shrink-0 rounded-xl ${block}`} />
            <div className="flex-1 space-y-2">
              <div className={`h-4 w-1/3 rounded-md ${block}`} />
              <div className={`h-3.5 w-2/3 rounded-md ${block}`} />
            </div>
            <div className={`h-4 w-12 rounded-md ${block}`} />
            <div className={`h-7 w-12 rounded-full ${block}`} />
          </div>
        ))}
      </div>
    </div>
  );
}
