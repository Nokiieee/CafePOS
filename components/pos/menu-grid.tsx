import Image from "next/image";
import { PiCoffeeBean } from "react-icons/pi";
import { formatPrice } from "@/lib/format-price";
import type { MenuItem } from "@/lib/menu";

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
              {item.image ? (
                <Image
                  src={item.image}
                  alt=""
                  fill
                  sizes="(min-width: 768px) 200px, 45vw"
                  className="object-contain p-2 mask-x-from-88% mask-x-to-100% mask-y-from-88% mask-y-to-100%"
                />
              ) : (
                <NoPhoto />
              )}
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

/**
 * In place of a photo, for an item that doesn't have one yet: the cafe's
 * bean, faint on white. It fills its box, which must be `relative`.
 */
export function NoPhoto() {
  return (
    <span aria-hidden className="absolute inset-0 flex items-center justify-center text-latte-300">
      <PiCoffeeBean className="size-1/3" />
    </span>
  );
}

/** Placeholder cards while the menu loads, the same size as the real ones. */
export function MenuGridSkeleton() {
  const block = "animate-pulse bg-latte-100 motion-reduce:animate-none";

  return (
    <div
      aria-busy="true"
      aria-label="Loading the menu"
      className="grid grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] gap-4"
    >
      {Array.from({ length: 8 }, (_, card) => (
        <div
          key={card}
          className="flex flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-latte-200"
        >
          {/* The photo, then the name and the price. The photo's square sits
              in a padded box: with a margin instead, WebKit made it taller
              than wide. */}
          <div className="p-2">
            <div className={`aspect-square rounded-xl ${block}`} />
          </div>
          <div className="flex flex-col gap-3.5 px-4 pt-1 pb-4">
            <div className={`h-4 w-3/4 rounded-md ${block}`} />
            <div className={`h-4 w-1/3 rounded-md ${block}`} />
          </div>
        </div>
      ))}
    </div>
  );
}
