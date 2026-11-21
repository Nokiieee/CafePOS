"use client";

import { useEffect, useId, useRef, useState } from "react";
import { PiSpinnerGap, PiWarningCircleFill, PiX } from "react-icons/pi";
import { saveMenuItem, type MenuActionResult, type PhotoChange } from "@/actions/menu";
import { hasDrinkOptions, unitPrice } from "@/components/pos/item-options";
import { OptionGroup, SegmentedControl } from "@/components/pos/option-controls";
import { formatPrice } from "@/lib/format-price";
import type { MenuItem } from "@/lib/menu";
import {
  checkMenuItem,
  MAX_DESCRIPTION_LENGTH,
  MAX_NAME_LENGTH,
  MENU_CATEGORIES,
  parsePrice,
  priceProblem as getPriceProblem,
  priceText,
} from "@/lib/menu-rules";
import { PhotoField, type PhotoDraft } from "./photo-field";

type MenuItemDialogProps = {
  /** The item to edit, "new" for Add item, or null when the popup is closed. */
  item: MenuItem | "new" | null;
  /** Called after the popup closes, however it was closed. */
  onClose: () => void;
};

// Shown when the request never got an answer, e.g. the Wi-Fi dropped.
const NO_CONNECTION_MESSAGE =
  "Couldn't reach the server. Check the internet connection and try again.";

// The categories as choices for the Category control.
const categoryOptions = MENU_CATEGORIES.map((category) => ({
  value: category.id,
  label: category.label,
}));

// The Menu page's popup for adding an item or changing one (admins only).
// Changes are only a draft until Save: × or Escape close it without saving.
// A tap outside doesn't close it, so typing isn't lost by a stray tap. Like
// the other popups, it's the browser's own <dialog>.
export function MenuItemDialog({ item, onClose }: MenuItemDialogProps) {
  const isOpen = item !== null;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  // True while the item is being saved.
  const [isSaving, setIsSaving] = useState(false);
  // Why the last try failed, shown above the button.
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (isOpen && dialog && !dialog.open) {
      dialog.showModal();
      // A new item starts in the Name box, so the iPad's keyboard is ready.
      // Otherwise, as in the other popups, focus the content, so Safari draws
      // no focus ring on the first button.
      const nameBox = contentRef.current?.querySelector<HTMLInputElement>("[data-autofocus]");
      (nameBox ?? contentRef.current)?.focus();
    }
  }, [isOpen]);

  function close() {
    dialogRef.current?.close();
  }

  async function save(details: unknown, photo: PhotoChange) {
    if (!item || isSaving) return;

    setIsSaving(true);
    setError(null);

    let result: MenuActionResult | undefined;
    try {
      result = await saveMenuItem(item === "new" ? null : item.id, details, photo);
    } catch {
      // The request itself failed, so there's no result to read.
      result = undefined;
    }

    setIsSaving(false);
    if (result?.ok) {
      // The page has already reloaded the menu, so the list shows the change.
      close();
    } else {
      // Everything typed stays, so Try again sends the same details.
      setError(result?.message ?? NO_CONNECTION_MESSAGE);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      // Escape closes the popup, except while saving, so it can't vanish
      // halfway through.
      onCancel={(event) => {
        if (isSaving) event.preventDefault();
      }}
      onClose={() => {
        setError(null);
        onClose();
      }}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto overscroll-contain rounded-3xl bg-white p-0 text-espresso-950 shadow-[0_24px_64px_-16px_rgb(42_24_16/0.45)] transition-[opacity,translate] duration-300 ease-out-expo [scrollbar-color:var(--color-latte-300)_transparent] backdrop:bg-espresso-950/40 motion-reduce:transition-none starting:open:translate-y-4 starting:open:opacity-0"
    >
      <div ref={contentRef} tabIndex={-1} className="outline-none">
        {/* Only drawn while open, so it always starts from the item as it is
            (or empty), not from a draft that was never saved. */}
        {item && (
          <MenuItemForm
            key={item === "new" ? "new" : item.id}
            titleId={titleId}
            item={item === "new" ? null : item}
            isSaving={isSaving}
            error={error}
            onCancel={close}
            onSave={save}
          />
        )}
      </div>
    </dialog>
  );
}

type MenuItemFormProps = {
  titleId: string;
  /** The item to edit, or null for a new one. */
  item: MenuItem | null;
  isSaving: boolean;
  error: string | null;
  onCancel: () => void;
  onSave: (details: unknown, photo: PhotoChange) => void;
};

function MenuItemForm({ titleId, item, isSaving, error, onCancel, onSave }: MenuItemFormProps) {
  const nameId = useId();
  const priceId = useId();
  const priceHintId = useId();
  const descriptionId = useId();

  const [name, setName] = useState(item?.name ?? "");
  // Coffee to begin with: most of the menu is coffee.
  const [categoryId, setCategoryId] = useState(item?.categoryId ?? MENU_CATEGORIES[0].id);
  // Kept as typed ("6.5"), and turned into cents when it's used.
  const [price, setPrice] = useState(item ? priceText(item.price) : "");
  const [description, setDescription] = useState(item?.description ?? "");
  // The price hint only turns into a problem after leaving the box, not
  // while a price is half typed.
  const [isPriceTouched, setIsPriceTouched] = useState(false);
  const [photo, setPhoto] = useState<PhotoDraft>({ kind: "keep" });
  // True while a picked photo is being cut to a square.
  const [isPreparingPhoto, setIsPreparingPhoto] = useState(false);

  // null when the text isn't a price, which fails the check and keeps Save
  // disabled.
  const priceCents = parsePrice(price);
  const checked = checkMenuItem({ name, description, categoryId, priceCents });
  const isDrink = hasDrinkOptions({ categoryId });

  // Under the price box: what's wrong with it, once something was typed and
  // the box was left, or, for coffee, what the three sizes cost.
  const problem =
    price.trim() && isPriceTouched ? getPriceProblem(categoryId, priceCents) : null;
  const priceHint =
    isDrink && priceCents !== null && !problem
      ? `Medium. Small ${formatPrice(unitPrice({ categoryId, price: priceCents }, "small"))} · Large ${formatPrice(unitPrice({ categoryId, price: priceCents }, "large"))}`
      : isDrink
        ? "The Medium price."
        : null;

  // The boxes' look, like the Orders search box. A box with a problem gets a
  // red edge instead (red: the color for something gone wrong).
  const fieldClass = (hasProblem = false) =>
    `w-full rounded-2xl border bg-white text-espresso-950 caret-espresso-700 transition-[border-color,box-shadow] duration-200 outline-none placeholder:text-roast-400 focus:ring-2 ${
      hasProblem
        ? "border-red-700 focus:ring-red-700/20"
        : "border-latte-300 hover:border-roast-400 focus:border-espresso-700 focus:ring-espresso-700/20"
    }`;
  const labelClass = "text-sm font-semibold text-espresso-900";

  return (
    // A form, so Enter in a box saves too (when Save is allowed).
    <form
      onSubmit={(event) => {
        event.preventDefault();
        setIsPriceTouched(true);
        if (!checked.ok || isSaving || isPreparingPhoto) return;
        onSave(
          checked.item,
          photo.kind === "new" ? photo.photo : photo.kind === "remove" ? "remove" : null,
        );
      }}
    >
      {/* inert while saving: nothing in here can be tapped or focused, so the
          details can't change halfway. */}
      <div inert={isSaving} className="flex items-start gap-4 px-5 pt-5 sm:px-7 sm:pt-6">
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className="text-2xl font-semibold tracking-tight">
            {item ? "Edit item" : "New item"}
          </h2>
          {/* Orders keep their own copy of the name and price (order_items). */}
          {item && (
            <p className="mt-1 text-roast-500">Past orders keep their old name and price.</p>
          )}
        </div>
        <button
          type="button"
          aria-label="Close without saving"
          onClick={onCancel}
          className="-mt-1 -mr-2 flex size-11 shrink-0 items-center justify-center rounded-xl text-roast-500 transition-colors duration-200 outline-none hover:bg-latte-100 hover:text-espresso-900 focus-visible:ring-2 focus-visible:ring-espresso-700 active:bg-latte-200"
        >
          <PiX aria-hidden className="size-6" />
        </button>
      </div>

      <div inert={isSaving} className="space-y-6 p-5 sm:px-7">
        <PhotoField
          current={item?.image ?? null}
          draft={photo}
          onChange={setPhoto}
          isPreparing={isPreparingPhoto}
          onPreparingChange={setIsPreparingPhoto}
        />

        <div>
          <label htmlFor={nameId} className={`mb-2.5 block ${labelClass}`}>
            Name
          </label>
          <input
            id={nameId}
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={MAX_NAME_LENGTH}
            placeholder="Iced Matcha Latte"
            autoComplete="off"
            data-autofocus={item ? undefined : true}
            className={`h-12 px-4 ${fieldClass()}`}
          />
        </div>

        <div>
          <OptionGroup
            title="Category"
            value={MENU_CATEGORIES.find((category) => category.id === categoryId)?.label ?? ""}
          >
            <SegmentedControl
              name="menu-item-category"
              value={categoryId}
              options={categoryOptions}
              onChange={setCategoryId}
            />
          </OptionGroup>
          <p className="mt-2 text-sm text-roast-500">
            {isDrink
              ? "Gets the Size, Ice and Sugar options on the Register."
              : "Sold as is: the cashier only picks how many."}
          </p>
        </div>

        <div>
          <label htmlFor={priceId} className={`mb-2.5 block ${labelClass}`}>
            Price
          </label>
          <div className="relative">
            <span
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-roast-500"
            >
              $
            </span>
            <input
              id={priceId}
              type="text"
              // The iPad shows its number keys, with a point.
              inputMode="decimal"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              onBlur={() => setIsPriceTouched(true)}
              placeholder="0.00"
              autoComplete="off"
              aria-invalid={problem ? true : undefined}
              aria-describedby={problem || priceHint ? priceHintId : undefined}
              className={`h-12 pr-4 pl-8 tabular-nums ${fieldClass(problem !== null)}`}
            />
          </div>
          {(problem || priceHint) && (
            <p
              id={priceHintId}
              className={`mt-2 text-sm tabular-nums ${problem ? "font-medium text-red-800" : "text-roast-500"}`}
            >
              {problem ?? priceHint}
            </p>
          )}
        </div>

        <div>
          <div className="mb-2.5 flex items-baseline justify-between gap-3">
            <label htmlFor={descriptionId} className={labelClass}>
              Description
            </label>
            <span className="text-sm text-roast-500 tabular-nums">
              Optional · {description.length}/{MAX_DESCRIPTION_LENGTH}
            </span>
          </div>
          <textarea
            id={descriptionId}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={MAX_DESCRIPTION_LENGTH}
            rows={3}
            placeholder="One short sentence, shown when the item is tapped on the Register."
            className={`block resize-none px-4 py-3 leading-relaxed ${fieldClass()}`}
          />
        </div>
      </div>

      <div className="sticky bottom-0 z-10 border-t border-latte-200 bg-milk px-5 py-4 sm:px-7">
        {/* role="alert" makes screen readers read it out as soon as it appears. */}
        {error && (
          <p
            role="alert"
            className="mb-3 flex items-start gap-2.5 rounded-2xl bg-latte-100 px-4 py-3 text-sm leading-snug font-medium text-espresso-900"
          >
            <PiWarningCircleFill aria-hidden className="size-5 shrink-0 text-espresso-700" />
            {error}
          </p>
        )}
        {/* Disabled until there's a name and a real price, and while a picked
            photo is being prepared. While saving it keeps its color
            (aria-disabled, not disabled), so it reads as "working on it"
            rather than "not allowed". */}
        <button
          type="submit"
          disabled={!checked.ok || isPreparingPhoto}
          aria-disabled={isSaving}
          className={`flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-espresso-700 text-lg font-semibold text-milk transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-espresso-700 focus-visible:ring-offset-2 focus-visible:ring-offset-milk disabled:cursor-not-allowed disabled:bg-latte-200 disabled:text-roast-400 ${
            isSaving ? "cursor-wait" : "hover:bg-espresso-800 active:bg-espresso-900"
          }`}
        >
          {isSaving ? (
            <>
              <PiSpinnerGap aria-hidden className="size-5 animate-spin motion-reduce:animate-none" />
              Saving…
            </>
          ) : error ? (
            "Try again"
          ) : item ? (
            "Save changes"
          ) : (
            "Add item"
          )}
        </button>
      </div>
    </form>
  );
}
