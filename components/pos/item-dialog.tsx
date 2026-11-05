"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { PiX } from "react-icons/pi";
import { formatPrice } from "@/lib/format-price";
import {
  defaultIce,
  defaultSize,
  defaultSugar,
  hasDrinkOptions,
  iceLevels,
  sizes,
  sugarLevels,
  unitPrice,
} from "./item-options";
import type { MenuItem } from "./menu-items";
import {
  OptionGroup,
  QuantityStepper,
  SegmentedControl,
  SizeCards,
} from "./option-controls";

type ItemDialogProps = {
  /** The item to show. null means the popup is closed. */
  item: MenuItem | null;
  /** Called after the popup closes, however it was closed. */
  onClose: () => void;
};

// The popup that opens when a menu card is tapped. It uses the browser's own
// <dialog> element, which handles Escape, keeps focus inside, and blocks
// taps on the page behind it.
export function ItemDialog({ item, onClose }: ItemDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  // When an item is picked, open the dialog as a modal.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (item && dialog && !dialog.open) {
      dialog.showModal();
    }
  }, [item]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onClose={onClose}
      // A tap on the dark area around the popup lands on the <dialog> itself
      // (the content covers the rest), so that closes it.
      onClick={(event) => {
        if (event.target === event.currentTarget) event.currentTarget.close();
      }}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-xl overflow-y-auto overscroll-contain rounded-3xl bg-white p-0 text-espresso-950 shadow-[0_24px_64px_-16px_rgb(42_24_16/0.45)] transition-[opacity,translate] duration-300 ease-out-expo [scrollbar-color:var(--color-latte-300)_transparent] backdrop:bg-espresso-950/40 motion-reduce:transition-none starting:open:translate-y-4 starting:open:opacity-0"
    >
      {/* key={item.id} gives each item fresh choices every time it opens. */}
      {item && (
        <ItemOptions
          key={item.id}
          item={item}
          titleId={titleId}
          descriptionId={descriptionId}
          onClose={() => dialogRef.current?.close()}
        />
      )}
    </dialog>
  );
}

type ItemOptionsProps = {
  item: MenuItem;
  titleId: string;
  descriptionId: string;
  onClose: () => void;
};

function ItemOptions({ item, titleId, descriptionId, onClose }: ItemOptionsProps) {
  const isDrink = hasDrinkOptions(item);
  const [size, setSize] = useState(defaultSize);
  const [sugar, setSugar] = useState(defaultSugar);
  const [ice, setIce] = useState(defaultIce);
  const [quantity, setQuantity] = useState(1);

  // The price of one (changes with size), and the total for the button.
  const price = unitPrice(item, size);
  const total = price * quantity;

  const sizeLabel = sizes.find((s) => s.id === size)?.label ?? "";

  return (
    // Plain block layout, on purpose: the popup is exactly as tall as its
    // content. A stretchy flex-1 middle left a blank gap below Sugar on iPad.
    // When the screen is short the <dialog> scrolls, and sticky keeps the
    // close button and Add to Billing on screen.
    <>
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="sticky top-3 z-10 mt-3 mr-3 -mb-14 ml-auto flex size-11 items-center justify-center rounded-xl text-roast-500 transition-colors duration-200 outline-none hover:bg-latte-100 hover:text-espresso-900 focus-visible:ring-2 focus-visible:ring-espresso-700 active:bg-latte-200"
      >
        <PiX aria-hidden className="size-6" />
      </button>

      <div className="space-y-6 p-5 sm:p-7">
        {/* Photo with the name, description and price of one beside it. */}
        <div className="flex items-center gap-4 pr-8 sm:gap-5">
          <div className="relative size-24 shrink-0 rounded-2xl bg-white ring-1 ring-latte-200 sm:size-28">
            <Image
              src={item.image}
              alt={item.name}
              fill
              sizes="112px"
              className="object-contain p-1.5 mask-x-from-88% mask-x-to-100% mask-y-from-88% mask-y-to-100%"
            />
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <h2
              id={titleId}
              className="text-xl leading-tight font-semibold tracking-tight text-balance sm:text-2xl"
            >
              {item.name}
            </h2>
            <p id={descriptionId} className="text-sm leading-snug text-roast-500">
              {item.description}
            </p>
            <p className="mt-1 text-xl font-semibold text-espresso-700 tabular-nums">
              {formatPrice(price)}
            </p>
          </div>
        </div>

        {isDrink && (
          <>
            <OptionGroup title="Size" value={sizeLabel}>
              <SizeCards value={size} onChange={setSize} />
            </OptionGroup>
            <OptionGroup title="Ice" value={ice}>
              <SegmentedControl
                name="ice"
                value={ice}
                onChange={setIce}
                options={iceLevels.map((level) => ({ value: level, label: level }))}
              />
            </OptionGroup>
            <OptionGroup title="Sugar" value={`${sugar}%`}>
              <SegmentedControl
                name="sugar"
                value={sugar}
                onChange={setSugar}
                options={sugarLevels.map((level) => ({ value: level, label: `${level}%` }))}
              />
            </OptionGroup>
          </>
        )}
      </div>

      <div className="sticky bottom-0 z-10 flex flex-wrap gap-3 border-t border-latte-200 bg-milk px-5 py-4 sm:px-7">
        <QuantityStepper value={quantity} onChange={setQuantity} />

        {/* Adding to the bill comes in the next step. */}
        <button
          type="button"
          className="flex h-14 flex-1 basis-52 items-center justify-between gap-3 rounded-2xl bg-espresso-700 px-5 text-lg font-semibold whitespace-nowrap text-milk transition-colors duration-200 outline-none hover:bg-espresso-800 focus-visible:ring-2 focus-visible:ring-espresso-700 focus-visible:ring-offset-2 focus-visible:ring-offset-milk active:bg-espresso-900"
        >
          Add to Billing
          <span className="tabular-nums">{formatPrice(total)}</span>
        </button>
      </div>
    </>
  );
}
