"use client";

import { useState, type ReactNode } from "react";
import { categories } from "./categories";
import { CategoryNav } from "./category-nav";

type PosScreenProps = {
  /** Shown at the top right, e.g. who is signed in. Rendered on the server. */
  account: ReactNode;
};

export function PosScreen({ account }: PosScreenProps) {
  const [selectedId, setSelectedId] = useState(categories[0].id);
  const selected =
    categories.find((category) => category.id === selectedId) ?? categories[0];
  const Icon = selected.icon;

  return (
    <div className="flex h-dvh bg-milk text-espresso-950">
      <CategoryNav selectedId={selected.id} onSelect={setSelectedId} />

      <main className="flex min-w-0 flex-1 flex-col gap-6 overflow-y-auto px-6 py-8 [scrollbar-color:var(--color-latte-300)_transparent] sm:px-10">
        <header className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">
            {selected.id === "all" ? "All items" : selected.label}
          </h1>
          <div className="min-w-0 max-w-full">{account}</div>
        </header>

        {/* Empty state until menu items are added. */}
        <section className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-latte-100 text-espresso-700">
            <Icon aria-hidden className="size-8" />
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-lg font-semibold">
              {selected.id === "all"
                ? "No menu items yet"
                : `Nothing in ${selected.label} yet`}
            </p>
            <p className="max-w-sm text-roast-500">
              Items added to the menu will appear here, ready to tap into an
              order.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
