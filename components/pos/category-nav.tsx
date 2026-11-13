"use client";

import { PiReceipt, PiReceiptFill } from "react-icons/pi";
import { categories } from "./categories";
import { Rail, RailLink, TILE_GAP, TILE_HEIGHT } from "./rail";

type CategoryNavProps = {
  selectedId: string;
  onSelect: (id: string) => void;
};

// The cashier screen's rail: the menu categories, and a link to Orders.
export function CategoryNav({ selectedId, onSelect }: CategoryNavProps) {
  const selectedIndex = Math.max(
    0,
    categories.findIndex((category) => category.id === selectedId),
  );

  return (
    <Rail
      footer={
        <RailLink
          href="/dashboard/orders"
          label="Orders"
          icon={PiReceipt}
          activeIcon={PiReceiptFill}
        />
      }
    >
      <nav aria-label="Menu categories">
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
    </Rail>
  );
}
