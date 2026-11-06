import Image from "next/image";
import { formatPrice } from "@/lib/format-price";
import type { MenuItem } from "./menu-items";

type MenuGridProps = {
  items: MenuItem[];
  /** Called with the item when its card is tapped. */
  onSelect: (item: MenuItem) => void;
};

export function MenuGrid({ items, onSelect }: MenuGridProps) {
  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] gap-4">
      {items.map((item) => (
        <li key={item.id} className="flex">
          {/* The whole card is one button, so it's easy to tap and works with the keyboard. */}
          <button
            type="button"
            onClick={() => onSelect(item)}
            className="flex w-full flex-col overflow-hidden rounded-2xl bg-white text-left ring-1 ring-latte-200 transition-[box-shadow,scale] duration-200 ease-out-expo outline-none hover:ring-roast-400 focus-visible:ring-2 focus-visible:ring-espresso-700 focus-visible:ring-offset-2 focus-visible:ring-offset-milk active:scale-[0.98] motion-reduce:transition-none"
          >
            {/* The photos have white backgrounds, so the card is white too. */}
            {/* <span> instead of <div>: a button may only contain inline elements. */}
            <span className="relative block aspect-square w-full">
              <Image
                src={item.image}
                alt=""
                fill
                sizes="(min-width: 768px) 200px, 45vw"
                className="object-contain p-2 mask-x-from-88% mask-x-to-100% mask-y-from-88% mask-y-to-100%"
              />
            </span>
            {/* flex-1 + justify-between pins the price to the bottom, so prices
                line up across a row even when a long name wraps to two lines. */}
            <span className="flex w-full flex-1 flex-col justify-between gap-1 px-4 pb-4">
              <span className="text-base leading-snug font-medium text-espresso-950">
                {item.name}
              </span>
              <span className="text-base font-semibold text-espresso-700 tabular-nums">
                {formatPrice(item.price)}
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
