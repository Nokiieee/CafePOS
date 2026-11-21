"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  PiBookOpenText,
  PiBookOpenTextFill,
  PiCashRegister,
  PiCashRegisterFill,
  PiChartBar,
  PiChartBarFill,
  PiReceipt,
  PiReceiptFill,
} from "react-icons/pi";
import {
  puckTileClass,
  Rail,
  RailLink,
  RailPuck,
  TILE_GAP,
  TILE_HEIGHT,
} from "@/components/pos/rail";

// Manage mode's pages, top to bottom.
const managePages = [
  {
    href: "/dashboard/orders",
    label: "Orders",
    icon: PiReceipt,
    activeIcon: PiReceiptFill,
    adminOnly: false,
  },
  {
    href: "/dashboard/summary",
    label: "Summary",
    icon: PiChartBar,
    activeIcon: PiChartBarFill,
    adminOnly: true,
  },
  {
    href: "/dashboard/menu",
    label: "Menu",
    icon: PiBookOpenText,
    activeIcon: PiBookOpenTextFill,
    adminOnly: true,
  },
] as const;

type ManageRailProps = {
  /** Admins also get the admin-only pages (Summary, Menu). */
  isAdmin: boolean;
};

// The rail in Manage mode: its pages at the top, with the same gliding puck as
// the categories in Register mode, and Register at the bottom to switch back.
//
// It lives in the Manage layout (app/dashboard/(manage)/layout.tsx), which
// stays on screen while moving between its pages. So the rail isn't drawn
// again: only the address changes, and the puck slides to the new page.
export function ManageRail({ isAdmin }: ManageRailProps) {
  const pathname = usePathname();

  // Summary and Menu only show for admins. On one of those pages the user
  // must be an admin (each page checks), so they all show there even before
  // the role is known, and the tiles don't shift when it arrives. Hiding a
  // tile is only for convenience: each page checks for itself.
  const isOnAdminPage = managePages.some((page) => page.adminOnly && page.href === pathname);
  const pages = managePages.filter((page) => !page.adminOnly || isAdmin || isOnAdminPage);
  const currentIndex = pages.findIndex((page) => page.href === pathname);

  return (
    <Rail
      footer={
        <RailLink
          href="/dashboard"
          label="Register"
          icon={PiCashRegister}
          activeIcon={PiCashRegisterFill}
        />
      }
    >
      <nav aria-label="Manage pages">
        <ul className="relative flex flex-col" style={{ gap: TILE_GAP }}>
          {currentIndex >= 0 && <RailPuck index={currentIndex} />}

          {pages.map((page) => {
            const isCurrent = page.href === pathname;
            const Icon = isCurrent ? page.activeIcon : page.icon;

            return (
              <li key={page.href} className="relative">
                <Link
                  href={page.href}
                  aria-current={isCurrent ? "page" : undefined}
                  className={puckTileClass(isCurrent)}
                  style={{ height: TILE_HEIGHT }}
                >
                  <Icon aria-hidden className="size-7" />
                  {page.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </Rail>
  );
}
