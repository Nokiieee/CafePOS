import { MAX_PHOTO_BYTES, PHOTO_SIZE } from "@/lib/menu-rules";

// Turns a photo from the iPad (camera, Photos or Files) or a computer into a
// menu photo: the middle square, 800 × 800, as a JPEG. Browser only: it uses
// the page's <img> and <canvas>.
//
// The middle square: a wide photo loses some of its left and right, a tall
// one some of its top and bottom. Every photo comes out the same shape and
// size as the others, and small enough to upload quickly.

/** Thrown when the file isn't a picture the browser can open. */
export class UnreadablePhotoError extends Error {}

// Smaller and smaller JPEGs, until one is under MAX_PHOTO_BYTES. The first
// almost always is.
const JPEG_QUALITIES = [0.85, 0.72, 0.6];

export async function squarePhoto(file: File): Promise<Blob> {
  // A temporary address for the file, so an <img> can open it.
  const url = URL.createObjectURL(file);

  try {
    const image = document.createElement("img");
    image.src = url;
    try {
      // Waits until the picture is loaded and decoded; fails if it can't be.
      await image.decode();
    } catch {
      throw new UnreadablePhotoError();
    }

    // The browser has already turned the photo the right way up (phones
    // save that as a note in the file), so these sizes are as it looks.
    const width = image.naturalWidth;
    const height = image.naturalHeight;
    if (!width || !height) throw new UnreadablePhotoError();
    const side = Math.min(width, height);

    const canvas = document.createElement("canvas");
    canvas.width = PHOTO_SIZE;
    canvas.height = PHOTO_SIZE;
    const context = canvas.getContext("2d");
    if (!context) throw new UnreadablePhotoError();

    // White first: JPEG has no see-through parts, and a see-through PNG
    // would otherwise turn black. White matches the menu cards.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, PHOTO_SIZE, PHOTO_SIZE);
    context.imageSmoothingQuality = "high";
    // The middle square of the photo, drawn to fill the canvas.
    context.drawImage(
      image,
      (width - side) / 2,
      (height - side) / 2,
      side,
      side,
      0,
      0,
      PHOTO_SIZE,
      PHOTO_SIZE,
    );

    for (const quality of JPEG_QUALITIES) {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", quality),
      );
      if (blob && blob.size <= MAX_PHOTO_BYTES) return blob;
    }
    throw new UnreadablePhotoError();
  } finally {
    URL.revokeObjectURL(url);
  }
}
