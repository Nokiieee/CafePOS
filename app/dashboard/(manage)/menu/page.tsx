import type { Metadata } from "next";
import { Suspense } from "react";
import { MenuListSkeleton, MenuManager } from "@/components/menu/menu-manager";
import { SignedInAs, SignedInAsFallback } from "@/components/pos/signed-in-as";
import { requireAdmin } from "@/lib/auth";
import { getAllMenuItems } from "@/lib/menu";

export const metadata: Metadata = {
  title: "Menu · Cafe POS",
};

// Menu management, for admins only: every item, including those taken off
// the menu, to add, change, and switch on or off. The rail around it comes
// from the Manage layout (app/dashboard/(manage)/layout.tsx).
export default function MenuPage() {
  return (
    <main className="flex min-w-0 flex-1 flex-col gap-6 overflow-y-auto px-6 pt-8 pb-8 [scrollbar-color:var(--color-latte-300)_transparent] sm:px-10">
      <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">Menu</h1>
        <div className="min-w-0 max-w-full">
          <Suspense fallback={<SignedInAsFallback />}>
            <SignedInAs />
          </Suspense>
        </div>
      </header>

      {/* The session and the menu depend on the request, so this part
          streams in after the page's frame (Cache Components rule). */}
      <Suspense fallback={<MenuListSkeleton />}>
        <MenuContent />
      </Suspense>
    </main>
  );
}

async function MenuContent() {
  // Admins only. Signed-out visitors go to the login page and cashiers go
  // back to the register, even if they type this page's address.
  await requireAdmin();

  const items = await getAllMenuItems();

  if (!items) {
    return (
      <p role="alert" className="rounded-2xl bg-latte-100 px-5 py-4 font-medium text-espresso-900">
        {"The menu couldn't be loaded. Check the internet connection and refresh the page."}
      </p>
    );
  }

  return <MenuManager items={items} />;
}
