"use client";

import { PiCoffeeBeanFill, PiSignOut } from "react-icons/pi";
import { logout } from "@/actions/auth";
import { categories } from "./categories";

// Tile size and gap, in px. The puck's position is calculated from these.
const TILE_HEIGHT = 76;
const TILE_GAP = 8;

type CategoryNavProps = {
  selectedId: string;
  onSelect: (id: string) => void;
};

export function CategoryNav({ selectedId, onSelect }: CategoryNavProps) {
  const selectedIndex = Math.max(
    0,
    categories.findIndex((category) => category.id === selectedId),
  );

  return (
    <aside className="flex w-28 shrink-0 flex-col items-center gap-8 bg-latte-100 py-6">
      {/* Logo mark */}
      <div className="flex flex-col items-center gap-1 text-espresso-900">
        <PiCoffeeBeanFill aria-hidden className="size-9" />
        <span className="text-xs font-semibold tracking-tight">Cafe POS</span>
      </div>

      <nav aria-label="Menu categories" className="flex-1">
        <ul className="relative flex flex-col" style={{ gap: TILE_GAP }}>
          {/* The "puck": one brown fill that glides to the selected tile. */}
          <li
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 rounded-2xl bg-espresso-700 shadow-[0_6px_14px_-6px_rgb(61_36_25/0.55)] transition-transform duration-500 ease-out-expo motion-reduce:transition-none"
            style={{
              height: TILE_HEIGHT,
              transform: `translateY(${selectedIndex * (TILE_HEIGHT + TILE_GAP)}px)`,
            }}
          />

          {categories.map((category) => {
            const isSelected = category.id === selectedId;
            const Icon = isSelected ? category.activeIcon : category.icon;

            return (
              <li key={category.id} className="relative">
                <button
                  type="button"
                  aria-current={isSelected ? "true" : undefined}
                  onClick={() => onSelect(category.id)}
                  className={`flex w-20 flex-col items-center justify-center gap-1.5 rounded-2xl text-sm font-medium transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-espresso-700 focus-visible:ring-offset-2 focus-visible:ring-offset-latte-100 ${
                    isSelected
                      ? "text-milk"
                      : "text-roast-500 hover:bg-latte-200 active:bg-latte-300"
                  }`}
                  style={{ height: TILE_HEIGHT }}
                >
                  <Icon aria-hidden className="size-7" />
                  {category.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <form action={logout}>
        <button
          type="submit"
          className="flex w-20 flex-col items-center justify-center gap-1.5 rounded-2xl py-3 text-sm font-medium text-roast-500 transition-colors duration-200 outline-none hover:bg-latte-200 hover:text-espresso-800 focus-visible:ring-2 focus-visible:ring-espresso-700 focus-visible:ring-offset-2 focus-visible:ring-offset-latte-100 active:bg-latte-300"
        >
          <PiSignOut aria-hidden className="size-6" />
          Sign out
        </button>
      </form>
    </aside>
  );
}
