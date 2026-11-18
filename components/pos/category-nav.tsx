"use client";

import type { ReactNode } from "react";
import { PiReceipt, PiReceiptFill } from "react-icons/pi";
import { categories } from "./categories";
import { puckTileClass, Rail, RailLink, RailPuck, TILE_GAP, TILE_HEIGHT } from "./rail";

type CategoryNavProps = {
  selectedId: string;
  onSelect: (id: string) => void;
  /** Admin-only page tiles (Summary), made on the server. See summary-link.tsx. */
  adminLinks: ReactNode;
};

// The cashier screen's rail: the menu categories, a link to Orders, and the
// admin-only tiles under it.
export function CategoryNav({ selectedId, onSelect, adminLinks }: CategoryNavProps) {
  const selectedIndex = Math.max(
    0,
    categories.findIndex((category) => category.id === selectedId),
  );

  return (
    <Rail
      footer={
        <>
          <RailLink
            href="/dashboard/orders"
            label="Orders"
            icon={PiReceipt}
            activeIcon={PiReceiptFill}
          />
          {adminLinks}
        </>
      }
    >
      <nav aria-label="Menu categories">
        <ul className="relative flex flex-col" style={{ gap: TILE_GAP }}>
          <RailPuck index={selectedIndex} />

          {categories.map((category) => {
            const isSelected = category.id === selectedId;
            const Icon = isSelected ? category.activeIcon : category.icon;

            return (
              <li key={category.id} className="relative">
                <button
                  type="button"
                  aria-current={isSelected ? "true" : undefined}
                  onClick={() => onSelect(category.id)}
                  className={puckTileClass(isSelected)}
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
