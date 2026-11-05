"use client";

import { useId, type ReactNode } from "react";
import { LuCupSoda } from "react-icons/lu";
import { PiMinusBold, PiPlusBold } from "react-icons/pi";
import { MAX_QUANTITY, sizes, type SizeId } from "./item-options";

// The same glide as the category rail's puck in category-nav.tsx: one piece
// that slides to the picked choice with the same speed and curve.
const PUCK_GLIDE =
  "pointer-events-none absolute transition-transform duration-500 ease-out-expo motion-reduce:transition-none";

type OptionGroupProps = {
  title: string;
  /** The current choice in words, shown at the right of the title. */
  value: string;
  children: ReactNode;
};

// A titled group of choices. This is a plain <div> with role="radiogroup"
// rather than <fieldset> and <legend>: with those, iPad Safari opened the
// popup with an extra gap in each group, as tall as the title row.
export function OptionGroup({ title, value, children }: OptionGroupProps) {
  const titleId = useId();

  return (
    <div role="radiogroup" aria-labelledby={titleId}>
      <div className="mb-2.5 flex items-baseline justify-between text-sm">
        <span id={titleId} className="font-semibold text-espresso-900">
          {title}
        </span>
        {/* Hidden from screen readers: they already announce the picked radio. */}
        <span aria-hidden className="text-roast-500">
          {value}
        </span>
      </div>
      {children}
    </div>
  );
}

type SegmentedControlProps<T extends string | number> = {
  name: string;
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
};

// A track of equal choices with a white puck under the picked one. Underneath,
// these are real radio buttons, so arrow keys and screen readers just work.
export function SegmentedControl<T extends string | number>({
  name,
  value,
  onChange,
  options,
}: SegmentedControlProps<T>) {
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );

  return (
    <div className="relative flex rounded-2xl bg-latte-100 p-1">
      <span
        aria-hidden
        className={`${PUCK_GLIDE} inset-y-1 left-1 rounded-xl bg-white shadow-[0_2px_6px_-2px_rgb(61_36_25/0.35)] ring-1 ring-latte-200`}
        style={{
          // The track's 4px padding on each side (0.5rem) isn't part of a choice.
          width: `calc((100% - 0.5rem) / ${options.length})`,
          transform: `translateX(${selectedIndex * 100}%)`,
        }}
      />

      {options.map((option) => {
        const isSelected = option.value === value;

        return (
          <label
            key={option.value}
            className={`relative flex h-11 flex-1 cursor-pointer items-center justify-center rounded-xl text-sm transition-colors duration-200 select-none has-focus-visible:ring-2 has-focus-visible:ring-espresso-700 ${
              isSelected
                ? "font-semibold text-espresso-800"
                : "font-medium text-roast-500 hover:text-espresso-800 active:bg-latte-200"
            }`}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={isSelected}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            {option.label}
          </label>
        );
      })}
    </div>
  );
}

// The cup drawn in each size card grows with the size.
const cupClass: Record<SizeId, string> = {
  small: "size-5",
  medium: "size-6 sm:size-7",
  large: "size-7 sm:size-9",
};

type SizeCardsProps = {
  value: SizeId;
  onChange: (value: SizeId) => void;
};

// Three cards. The picked one turns latte with a brown edge straight away.
export function SizeCards({ value, onChange }: SizeCardsProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {sizes.map((size) => {
        const isSelected = size.id === value;

        return (
          <label
            key={size.id}
            className={`relative flex h-16 cursor-pointer items-center justify-center gap-2 rounded-2xl transition-[background-color,box-shadow] duration-200 select-none has-focus-visible:ring-2 has-focus-visible:ring-espresso-700 has-focus-visible:ring-offset-2 has-focus-visible:ring-offset-white sm:gap-3 ${
              isSelected
                ? "bg-latte-100 ring-2 ring-espresso-700"
                : "ring-1 ring-latte-300 hover:ring-roast-400 active:bg-latte-100"
            }`}
          >
            <input
              type="radio"
              name="size"
              value={size.id}
              checked={isSelected}
              onChange={() => onChange(size.id)}
              className="sr-only"
            />
            <span
              aria-hidden
              className={`flex h-9 w-7 items-end justify-center transition-colors duration-200 sm:w-9 ${
                isSelected ? "text-espresso-700" : "text-roast-500"
              }`}
            >
              <LuCupSoda className={cupClass[size.id]} />
            </span>
            <span className="flex flex-col">
              <span aria-hidden className="text-base leading-tight font-semibold text-espresso-950">
                {size.short}
              </span>
              <span className="text-sm leading-tight text-roast-500">{size.label}</span>
            </span>
          </label>
        );
      })}
    </div>
  );
}

type QuantityStepperProps = {
  value: number;
  onChange: (value: number) => void;
};

export function QuantityStepper({ value, onChange }: QuantityStepperProps) {
  return (
    <div
      role="group"
      aria-label="Quantity"
      className="flex h-14 grow items-center rounded-2xl bg-white ring-1 ring-latte-300 sm:grow-0"
    >
      <StepButton
        label="Decrease quantity"
        disabled={value <= 1}
        onClick={() => onChange(Math.max(1, value - 1))}
      >
        <PiMinusBold aria-hidden className="size-4" />
      </StepButton>
      <output
        aria-live="polite"
        className="min-w-8 flex-1 text-center text-lg font-semibold text-espresso-950 tabular-nums"
      >
        {value}
      </output>
      <StepButton
        label="Increase quantity"
        disabled={value >= MAX_QUANTITY}
        onClick={() => onChange(Math.min(MAX_QUANTITY, value + 1))}
      >
        <PiPlusBold aria-hidden className="size-4" />
      </StepButton>
    </div>
  );
}

type StepButtonProps = {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
};

function StepButton({ label, disabled, onClick, children }: StepButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-full w-12 items-center justify-center rounded-2xl text-espresso-800 transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-espresso-700 focus-visible:ring-inset active:bg-latte-100 disabled:cursor-not-allowed disabled:text-roast-400 disabled:active:bg-transparent"
    >
      {children}
    </button>
  );
}
