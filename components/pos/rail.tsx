import Link from "next/link";
import type { ReactNode } from "react";
import type { IconType } from "react-icons";
import { PiCoffeeBeanFill } from "react-icons/pi";

// The latte-colored column on the left of every dashboard page: the logo at
// the top, the page's own tiles in the middle, and page links at the bottom.

// Tile size and gap, in px. The category puck's position is calculated from these.
export const TILE_HEIGHT = 76;
export const TILE_GAP = 8;

type RailProps = {
  /** The middle: category tiles on the cashier screen. */
  children: ReactNode;
  /** Pinned to the bottom: links to other pages. */
  footer: ReactNode;
};

export function Rail({ children, footer }: RailProps) {
  return (
    <aside className="flex w-28 shrink-0 flex-col items-center gap-8 overflow-y-auto bg-latte-100 py-6 [scrollbar-width:none]">
      {/* Logo mark */}
      <div className="flex flex-col items-center gap-1 text-espresso-900">
        <PiCoffeeBeanFill aria-hidden className="size-9" />
        <span className="text-xs font-semibold tracking-tight">Cafe POS</span>
      </div>

      <div className="flex-1">{children}</div>

      <nav aria-label="Pages">{footer}</nav>
    </aside>
  );
}

type RailLinkProps = {
  href: "/dashboard" | "/dashboard/orders";
  label: string;
  /** Outline icon, for when this isn't the current page. */
  icon: IconType;
  /** Filled icon, for the current page. */
  activeIcon: IconType;
  isCurrent?: boolean;
};

// A tile that goes to another page. On its own page it's filled brown, like
// the selected category's puck.
export function RailLink({ href, label, icon, activeIcon, isCurrent = false }: RailLinkProps) {
  const Icon = isCurrent ? activeIcon : icon;

  return (
    <Link
      href={href}
      aria-current={isCurrent ? "page" : undefined}
      className={`flex w-20 flex-col items-center justify-center gap-1.5 rounded-2xl text-sm font-medium transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-espresso-700 focus-visible:ring-offset-2 focus-visible:ring-offset-latte-100 ${
        isCurrent
          ? "bg-espresso-700 text-milk shadow-[0_6px_14px_-6px_rgb(61_36_25/0.55)]"
          : "text-roast-500 hover:bg-latte-200 active:bg-latte-300"
      }`}
      style={{ height: TILE_HEIGHT }}
    >
      <Icon aria-hidden className="size-7" />
      {label}
    </Link>
  );
}
