import { PiChartBar, PiChartBarFill } from "react-icons/pi";
import { getCurrentUser, getRole } from "@/lib/auth";
import { RailLink } from "./rail";

// The rail's Summary tile, for admins only. Cashiers get nothing.
//
// It reads the session to know the role, so it must sit inside <Suspense>
// (Cache Components rule). The fallback is null: the rest of the rail shows
// straight away, and the tile appears a moment later for admins.
// Hiding the tile is only for convenience: the Summary page checks the role
// again with requireAdmin().
export async function SummaryLink() {
  const user = await getCurrentUser();
  if ((await getRole(user)) !== "admin") return null;

  return <SummaryRailLink />;
}

/** The tile itself. On the Summary page it's drawn as the current page. */
export function SummaryRailLink({ isCurrent = false }: { isCurrent?: boolean }) {
  return (
    <RailLink
      href="/dashboard/summary"
      label="Summary"
      icon={PiChartBar}
      activeIcon={PiChartBarFill}
      isCurrent={isCurrent}
    />
  );
}
