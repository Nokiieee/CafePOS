import { Suspense } from "react";
import { ManageRail } from "@/components/manage/manage-rail";
import { getCurrentUser, getRole } from "@/lib/auth";

// Manage mode: the frame and rail around Orders, Summary and Menu.
//
// "(manage)" is a route group: the brackets keep the folder out of the
// address, so the pages are still /dashboard/orders, /dashboard/summary and
// /dashboard/menu. A layout stays on screen while moving between its pages,
// which is what lets the rail's puck glide from one to another instead of
// jumping.
export default function ManageLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <div className="flex h-dvh bg-milk text-espresso-950">
      {/* The role needs the session, so it's read inside Suspense (Cache
          Components rule). Until it's known, the rail shows without the
          admin-only pages. */}
      <Suspense fallback={<ManageRail isAdmin={false} />}>
        <ManageRailForUser />
      </Suspense>
      {children}
    </div>
  );
}

async function ManageRailForUser() {
  const user = await getCurrentUser();
  return <ManageRail isAdmin={(await getRole(user)) === "admin"} />;
}
