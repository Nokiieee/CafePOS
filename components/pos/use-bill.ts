"use client";

import { useState } from "react";
import {
  billItemCount,
  billTotal,
  createBillId,
  createLine,
  type BillLine,
  type ItemChoice,
  type OrderType,
} from "./bill";
import { MAX_QUANTITY } from "./item-options";

// Everything about the current bill, and the actions that change it.
export function useBill() {
  const [id, setId] = useState<string | null>(null);
  const [lines, setLines] = useState<BillLine[]>([]);
  const [orderType, setOrderType] = useState<OrderType>("dine-in");
  // A new object on every add, so the panel can scroll even to the same row.
  const [lastAdded, setLastAdded] = useState<{ key: string } | null>(null);

  function add(choice: ItemChoice) {
    const line = createLine(choice);

    // The first item starts a new bill.
    if (!id) setId(createBillId());

    const existing = lines.find((l) => l.key === line.key);
    setLines(
      existing
        ? lines.map((l) =>
            l.key === line.key
              ? { ...l, quantity: Math.min(MAX_QUANTITY, l.quantity + line.quantity) }
              : l,
          )
        : [...lines, line],
    );
    setLastAdded({ key: line.key });
  }

  function changeQuantity(key: string, change: number) {
    const next = lines
      .map((l) => (l.key === key ? { ...l, quantity: l.quantity + change } : l))
      .filter((l) => l.quantity > 0);

    setLines(next);
    // Removing the last row ends the bill.
    if (next.length === 0) setId(null);
  }

  function clear() {
    setLines([]);
    setId(null);
    setOrderType("dine-in");
  }

  return {
    id,
    lines,
    orderType,
    lastAdded,
    total: billTotal(lines),
    itemCount: billItemCount(lines),
    setOrderType,
    add,
    changeQuantity,
    clear,
  };
}

export type Bill = ReturnType<typeof useBill>;
