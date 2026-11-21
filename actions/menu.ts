"use server";

import { refresh } from "next/cache";
import { getCurrentUser, getRole } from "@/lib/auth";
import {
  checkMenuItem,
  idFromName,
  isMenuItemId,
  MAX_PHOTO_BYTES,
  uniqueId,
} from "@/lib/menu-rules";
import { createClient } from "@/lib/supabase/server";

/** Saved, or a message to show the admin. */
export type MenuActionResult = { ok: true } | { ok: false; message: string };

/**
 * What to do with an item's photo when saving: a new photo (an 800 × 800
 * JPEG, made by lib/square-photo.ts), "remove" it, or null to keep it as is.
 */
export type PhotoChange = Blob | "remove" | null;

const NOT_ADMIN = "Only admins can change the menu.";
const NOT_FOUND = "This item couldn't be found. Refresh the page and try again.";
const CONNECTION_PROBLEM = "The change couldn't be saved. Check the internet connection and try again.";

// The Storage bucket for menu photos (supabase/menu-photos.sql). The same
// name is allowed for next/image in next.config.ts.
const PHOTO_BUCKET = "menu-photos";

// The database's code for "a row with this key already exists".
const ALREADY_EXISTS = "23505";

// New items go at the end of their category, this far after the last one.
const SORT_STEP = 10;

/** What saveMenuItem reads about every item. */
type MenuRow = {
  id: string;
  name: string;
  category_id: string;
  sort_order: number;
  is_on_menu: boolean;
  image: string | null;
};

// Adds a menu item (id null) or changes one, and its photo. Admins only.
//
// Nothing from the browser is trusted: the details and the photo are checked
// again here, and the database and Storage check the admin rule and the
// limits once more (supabase/menu.sql, menu-photos.sql). Changing an item
// never changes past orders, which keep their own copy of the name and price.
export async function saveMenuItem(
  id: string | null,
  input: unknown,
  photo: PhotoChange = null,
): Promise<MenuActionResult> {
  // Signed-out callers are sent to the login page.
  const user = await getCurrentUser();
  if ((await getRole(user)) !== "admin") return { ok: false, message: NOT_ADMIN };

  if (id !== null && !isMenuItemId(id)) return { ok: false, message: NOT_FOUND };
  const checked = checkMenuItem(input);
  if (!checked.ok) return checked;
  const item = checked.item;
  if (photo !== null && photo !== "remove" && !(await isMenuPhoto(photo))) {
    return { ok: false, message: "This photo couldn't be used. Choose it again." };
  }

  // The whole menu is small, so one read answers everything below: which
  // names and ids are taken, where each category ends, and the old photo.
  const supabase = await createClient();
  const { data: rows, error: readError } = await supabase
    .from("menu_items")
    .select("id, name, category_id, sort_order, is_on_menu, image")
    .overrideTypes<MenuRow[], { merge: false }>();
  if (readError) {
    console.error("Reading the menu failed:", readError.message);
    return { ok: false, message: CONNECTION_PROBLEM };
  }

  const current = id === null ? null : rows.find((row) => row.id === id);
  if (id !== null && !current) return { ok: false, message: NOT_FOUND };

  // Two items with the same name would look the same on the Register.
  // Capitals don't count: "iced latte" is the same as "Iced Latte".
  const sameName = rows.find(
    (row) => row.id !== id && row.name.toLowerCase() === item.name.toLowerCase(),
  );
  if (sameName) {
    return {
      ok: false,
      message: sameName.is_on_menu
        ? `There's already an item called ${sameName.name}.`
        : `There's already an item called ${sameName.name}, off the menu. Switch it back on instead.`,
    };
  }

  // After the last item of the category.
  const endOf = (categoryId: string) =>
    Math.max(0, ...rows.filter((row) => row.category_id === categoryId).map((row) => row.sort_order)) +
    SORT_STEP;

  // A new item's id comes from its name ("matcha-latte", or "matcha-latte-2"
  // if that's taken) and never changes afterwards.
  const itemId =
    current?.id ??
    uniqueId(
      idFromName(item.name),
      rows.map((row) => row.id),
    );

  // The photo goes up first, so the row can be saved with its address.
  // undefined: the photo stays as it is.
  let image: string | null | undefined;
  if (photo === "remove") {
    image = null;
  } else if (photo !== null) {
    image = await uploadPhoto(supabase, itemId, photo);
    if (!image) {
      return {
        ok: false,
        message: "The photo couldn't be uploaded. Check the internet connection and try again.",
      };
    }
  }

  const details = {
    name: item.name,
    description: item.description,
    category_id: item.categoryId,
    price_cents: item.priceCents,
    ...(image !== undefined && { image }),
  };

  // If the item can't be saved, the photo just uploaded for it isn't needed.
  const failed = async (message: string): Promise<MenuActionResult> => {
    if (image) await deletePhoto(supabase, image);
    return { ok: false, message };
  };

  if (!current) {
    // A new item, on the menu straight away, at the end of its category.
    const { error } = await supabase.from("menu_items").insert({
      ...details,
      id: itemId,
      sort_order: endOf(item.categoryId),
    });
    if (error) {
      console.error("Adding a menu item failed:", error.message);
      return failed(
        // Someone else added an item with the same id a moment ago.
        error.code === ALREADY_EXISTS ? "Something changed meanwhile. Try again." : CONNECTION_PROBLEM,
      );
    }
  } else {
    // Moving to another category puts it at the end of that category.
    const moved = current.category_id !== item.categoryId;
    const { data, error } = await supabase
      .from("menu_items")
      .update(moved ? { ...details, sort_order: endOf(item.categoryId) } : details)
      .eq("id", current.id)
      // Asks for the changed row back: none means the database refused.
      .select("id");
    if (error || data.length === 0) {
      console.error("Changing a menu item failed:", error?.message ?? "no row changed");
      return failed(CONNECTION_PROBLEM);
    }

    // The photo it replaced (or removed) isn't used anymore. Only uploaded
    // photos are deleted; the starting ones are part of the app.
    if (image !== undefined && current.image && current.image !== image) {
      await deletePhoto(supabase, current.image);
    }
  }

  // Redraws the Menu page with the change.
  refresh();
  return { ok: true };
}

// Puts an item on the menu or takes it off. Admins only. Off means hidden
// from the Register; the item stays, so it can be switched back on.
export async function setItemOnMenu(id: string, isOnMenu: boolean): Promise<MenuActionResult> {
  const user = await getCurrentUser();
  if ((await getRole(user)) !== "admin") return { ok: false, message: NOT_ADMIN };

  if (!isMenuItemId(id) || typeof isOnMenu !== "boolean") {
    return { ok: false, message: NOT_FOUND };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("menu_items")
    .update({ is_on_menu: isOnMenu })
    .eq("id", id)
    .select("id");
  if (error || data.length === 0) {
    console.error("Switching a menu item failed:", error?.message ?? "no row changed");
    return { ok: false, message: CONNECTION_PROBLEM };
  }

  refresh();
  return { ok: true };
}

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

// True for a JPEG file of a sensible size. A JPEG starts with the bytes
// FF D8 FF, whatever its name or type says, so that's what's checked.
async function isMenuPhoto(photo: unknown): Promise<boolean> {
  if (!(photo instanceof Blob) || photo.size === 0 || photo.size > MAX_PHOTO_BYTES) return false;
  const start = new Uint8Array(await photo.slice(0, 3).arrayBuffer());
  return start[0] === 0xff && start[1] === 0xd8 && start[2] === 0xff;
}

// Uploads a photo for an item and gives its web address, or null if it
// failed. Every upload gets a new random name, so a changed photo has a new
// address and no browser keeps showing the old one from its cache.
async function uploadPhoto(
  supabase: SupabaseClient,
  itemId: string,
  photo: Blob,
): Promise<string | null> {
  const path = `${itemId}/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, await photo.arrayBuffer(), {
      contentType: "image/jpeg",
      // A name is never reused, so browsers may keep the photo for a year.
      cacheControl: "31536000",
      upsert: false,
    });
  if (error) {
    console.error("Uploading a menu photo failed:", error.message);
    return null;
  }
  return supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;
}

// Deletes an uploaded photo by its web address. Addresses outside the bucket
// (the starting photos, under public/menu/) are left alone. A failure is
// only logged: the item is already saved, and a leftover file harms nothing.
async function deletePhoto(supabase: SupabaseClient, address: string): Promise<void> {
  // ".../storage/v1/object/public/menu-photos/" + the file's path.
  const bucketAddress = supabase.storage.from(PHOTO_BUCKET).getPublicUrl("").data.publicUrl;
  if (!address.startsWith(bucketAddress)) return;

  const path = address.slice(bucketAddress.length).replace(/^\/+/, "");
  if (!path) return;
  const { error } = await supabase.storage.from(PHOTO_BUCKET).remove([path]);
  if (error) console.error("Deleting an old menu photo failed:", error.message);
}
