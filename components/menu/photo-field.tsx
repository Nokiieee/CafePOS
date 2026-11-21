"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { PiSpinnerGap } from "react-icons/pi";
import { NoPhoto } from "@/components/pos/menu-grid";
import { PHOTO_SIZE } from "@/lib/menu-rules";
import { squarePhoto } from "@/lib/square-photo";

/** The photo in the popup, until Save: as it was, removed, or a new one. */
export type PhotoDraft =
  | { kind: "keep" }
  | { kind: "remove" }
  | {
      kind: "new";
      /** The 800 × 800 JPEG that Save uploads. */
      photo: Blob;
      /** A temporary address for showing it here before it's uploaded. */
      preview: string;
    };

type PhotoFieldProps = {
  /** The item's photo now (null: none yet). */
  current: string | null;
  draft: PhotoDraft;
  onChange: (draft: PhotoDraft) => void;
  /** True while a picked photo is being cut to a square. Save waits for it. */
  isPreparing: boolean;
  onPreparingChange: (isPreparing: boolean) => void;
};

// The Photo part of the item popup. Choose photo opens the iPad's own menu
// (Take Photo, Photo Library, Choose File), or the file window on a computer.
// The photo is cut to a square and resized here in the browser, so what's
// shown is exactly what Save uploads.
export function PhotoField({
  current,
  draft,
  onChange,
  isPreparing,
  onPreparingChange,
}: PhotoFieldProps) {
  const titleId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  // Why the last picked photo couldn't be used.
  const [problem, setProblem] = useState<string | null>(null);

  // A new photo's temporary address takes memory until it's let go: when
  // another photo replaces it, or the popup closes.
  const preview = draft.kind === "new" ? draft.preview : null;
  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  const shown = draft.kind === "new" ? draft.preview : draft.kind === "remove" ? null : current;

  async function preparePhoto(file: File) {
    setProblem(null);
    onPreparingChange(true);
    try {
      const photo = await squarePhoto(file);
      onChange({ kind: "new", photo, preview: URL.createObjectURL(photo) });
    } catch {
      setProblem("This photo couldn't be opened. Try another one, or a JPEG or PNG file.");
    } finally {
      onPreparingChange(false);
    }
  }

  return (
    <div role="group" aria-labelledby={titleId}>
      <p id={titleId} className="mb-2.5 text-sm font-semibold text-espresso-900">
        Photo
      </p>
      <div className="flex items-center gap-4">
        {/* The same white square as the item popup on the Register. */}
        <div className="relative size-28 shrink-0 overflow-hidden rounded-2xl bg-white ring-1 ring-latte-200">
          {shown ? (
            <Image src={shown} alt="" fill sizes="112px" className="object-contain" />
          ) : (
            <NoPhoto />
          )}
          {isPreparing && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80">
              <PiSpinnerGap
                aria-label="Preparing the photo"
                className="size-7 animate-spin text-espresso-700 motion-reduce:animate-none"
              />
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-col items-start gap-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={isPreparing}
              onClick={() => inputRef.current?.click()}
              className="flex h-11 items-center rounded-xl bg-white px-4 font-semibold text-espresso-900 ring-1 ring-latte-300 transition-[background-color,box-shadow] duration-200 outline-none hover:ring-roast-400 focus-visible:ring-2 focus-visible:ring-espresso-700 active:bg-latte-100 disabled:cursor-wait disabled:text-roast-400"
            >
              {shown ? "Change photo" : "Choose photo"}
            </button>
            {shown && (
              <button
                type="button"
                disabled={isPreparing}
                onClick={() => {
                  setProblem(null);
                  onChange({ kind: "remove" });
                }}
                className="flex h-11 items-center rounded-xl px-3 font-medium text-roast-500 transition-colors duration-200 outline-none hover:bg-latte-100 hover:text-espresso-900 focus-visible:ring-2 focus-visible:ring-espresso-700 active:bg-latte-200 disabled:cursor-wait"
              >
                Remove
              </button>
            )}
          </div>
          {/* role="alert" only for the problem, so it's read out when it appears. */}
          <p
            role={problem ? "alert" : undefined}
            className={`text-sm leading-snug ${problem ? "font-medium text-red-800" : "text-roast-500"}`}
          >
            {problem ??
              `Cut to a square from the middle, ${PHOTO_SIZE} × ${PHOTO_SIZE}, like the other photos.`}
          </p>
        </div>
      </div>

      {/* The browser's file picker, opened by Choose photo. It's only hidden
          from view (not display: none), because iPad Safari won't open a
          picker that isn't drawn. */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        tabIndex={-1}
        aria-hidden
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          // Emptied, so picking the same file again still counts as a change.
          event.target.value = "";
          if (file) void preparePhoto(file);
        }}
      />
    </div>
  );
}
