import { getCurrentUser, getDisplayName } from "@/lib/auth";
import { AccountMenu } from "./account-menu";

// The account pill at the top right of dashboard pages.
// Reads the session, so it must sit inside <Suspense> (Cache Components rule).
// getCurrentUser() also sends signed-out visitors back to the login page.
export async function SignedInAs() {
  const user = await getCurrentUser();

  return <AccountMenu name={getDisplayName(user)} />;
}

/** Shown while the account pill loads. */
export function SignedInAsFallback() {
  return <span className="text-sm text-roast-500">Loading…</span>;
}
