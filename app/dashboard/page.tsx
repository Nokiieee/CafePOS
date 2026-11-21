import { Suspense } from "react";
import { PosScreen } from "@/components/pos/pos-screen";
import { SignedInAs, SignedInAsFallback } from "@/components/pos/signed-in-as";
import { getMenu } from "@/lib/menu";

export default function DashboardPage() {
  // Started here but not awaited, so the screen draws right away and only
  // the menu grid waits for it (PosScreen reads it inside <Suspense>).
  // The menu needs a signed-in user: the database only shows it to staff,
  // and SignedInAs below sends anyone signed out to the login page.
  const menu = getMenu();

  return (
    <PosScreen
      account={
        <Suspense fallback={<SignedInAsFallback />}>
          <SignedInAs />
        </Suspense>
      }
      menu={menu}
    />
  );
}
