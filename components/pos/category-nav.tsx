"use client";

import { PiClipboardText, PiClipboardTextFill } from "react-icons/pi";
import { categories } from "./categories";
import { puckTileClass, Rail, RailLink, RailPuck, TILE_GAP, TILE_HEIGHT } from "./rail";

type CategoryNavProps = {
  selectedId: string;
  onSelect: (id: string) => void;
};

// The rail in Register mode: the menu categories at the top, and Manage at
// the bottom, which switches to Manage mode (Orders, and Summary for admins).
// Manage opens Orders, the one page every cashier can use.
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
          label="Manage"
          icon={PiClipboardText}
          activeIcon={PiClipboardTextFill}
        />
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
