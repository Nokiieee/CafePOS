"use server";

import { refresh } from "next/cache";
import { getCurrentUser, getRole } from "@/lib/auth";
import { checkMenuItem, idFromName, isMenuItemId, uniqueId } from "@/lib/menu-rules";
import { createClient } from "@/lib/supabase/server";

/** Saved, or a message to show the admin. */
export type MenuActionResult = { ok: true } | { ok: false; message: string };

const NOT_ADMIN = "Only admins can change the menu.";
const NOT_FOUND = "This item couldn't be found. Refresh the page and try again.";
const CONNECTION_PROBLEM = "The change couldn't be saved. Check the internet connection and try again.";

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
};

// Adds a menu item (id null) or changes one. Admins only.
//
// Nothing from the browser is trusted: the details are checked again here,
// and the database checks the admin rule and the limits once more
// (supabase/menu.sql). Changing an item never changes past orders, which
// keep their own copy of the name and price.
export async function saveMenuItem(id: string | null, input: unknown): Promise<MenuActionResult> {
  // Signed-out callers are sent to the login page.
  const user = await getCurrentUser();
  if ((await getRole(user)) !== "admin") return { ok: false, message: NOT_ADMIN };

  if (id !== null && !isMenuItemId(id)) return { ok: false, message: NOT_FOUND };
  const checked = checkMenuItem(input);
  if (!checked.ok) return checked;
  const item = checked.item;

  // The whole menu is small, so one read answers everything below: which
  // names and ids are taken, and where each category ends.
  const supabase = await createClient();
  const { data: rows, error: readError } = await supabase
    .from("menu_items")
    .select("id, name, category_id, sort_order, is_on_menu")
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

  const details = {
    name: item.name,
    description: item.description,
    category_id: item.categoryId,
    price_cents: item.priceCents,
  };

  if (!current) {
    // A new item, on the menu straight away, at the end of its category. Its
    // id comes from its name ("matcha-latte", or "matcha-latte-2" if that's
    // taken) and never changes afterwards.
    const { error } = await supabase.from("menu_items").insert({
      ...details,
      id: uniqueId(
        idFromName(item.name),
        rows.map((row) => row.id),
      ),
      sort_order: endOf(item.categoryId),
    });
    if (error) {
      console.error("Adding a menu item failed:", error.message);
      return {
        ok: false,
        // Someone else added an item with the same id a moment ago.
        message: error.code === ALREADY_EXISTS ? "Something changed meanwhile. Try again." : CONNECTION_PROBLEM,
      };
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
      return { ok: false, message: CONNECTION_PROBLEM };
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
