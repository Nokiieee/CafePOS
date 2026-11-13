"use client";

import { createContext, use, type ReactNode } from "react";
import { useBill, type Bill } from "./use-bill";

// The current bill, shared by every page under /dashboard.
//
// The provider sits in app/dashboard/layout.tsx. A layout stays on screen
// while you move between the pages inside it, so the bill survives a trip
// to Orders and back. If the bill lived in the cashier screen itself, it
// could be lost when that page is put away.
const BillContext = createContext<Bill | null>(null);

export function BillProvider({ children }: { children: ReactNode }) {
  const bill = useBill();
  return <BillContext value={bill}>{children}</BillContext>;
}

/** The current bill. Only works inside <BillProvider>. */
export function useCurrentBill(): Bill {
  const bill = use(BillContext);
  if (!bill) {
    throw new Error("useCurrentBill() must be used inside <BillProvider>.");
  }
  return bill;
}
