import { Suspense } from "react";
import { AccountMenu } from "@/components/pos/account-menu";
import { PosScreen } from "@/components/pos/pos-screen";
import { getCurrentUser, getDisplayName } from "@/lib/auth";

export default function DashboardPage() {
  return (
    <PosScreen
      account={
        <Suspense
          fallback={<span className="text-sm text-roast-500">Loading…</span>}
        >
          <SignedInAs />
        </Suspense>
      }
    />
  );
}

// Reads the session, so it must sit inside <Suspense> (Cache Components rule).
// getCurrentUser() also sends signed-out visitors back to the login page.
async function SignedInAs() {
  const user = await getCurrentUser();

  return <AccountMenu name={getDisplayName(user)} />;
}
