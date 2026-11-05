import Image from "next/image";
import { formatPrice } from "@/lib/format-price";
import type { MenuItem } from "./menu-items";

type MenuGridProps = {
  items: MenuItem[];
};

export function MenuGrid({ items }: MenuGridProps) {
  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-4">
      {items.map((item) => (
        <li
          key={item.id}
          className="flex flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-latte-200"
        >
          {/* The photos have white backgrounds, so the card is white too. */}
          <div className="relative aspect-square">
            <Image
              src={item.image}
              alt={item.name}
              fill
              sizes="(min-width: 1280px) 15vw, (min-width: 768px) 22vw, 45vw"
              className="object-contain p-2 mask-x-from-88% mask-x-to-100% mask-y-from-88% mask-y-to-100%"
            />
          </div>
          {/* flex-1 + justify-between pins the price to the bottom, so prices
              line up across a row even when a long name wraps to two lines. */}
          <div className="flex flex-1 flex-col justify-between gap-1 px-4 pb-4">
            <p className="text-base leading-snug font-medium text-espresso-950">
              {item.name}
            </p>
            <p className="text-base font-semibold text-espresso-700 tabular-nums">
              {formatPrice(item.price)}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
