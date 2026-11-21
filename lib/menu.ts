import { categories } from "@/components/pos/categories";
import { createClient } from "@/lib/supabase/server";

// Reading the menu from Supabase (supabase/menu.sql). Server-only: it uses
// the per-request Supabase client, which reads the signed-in user's cookies.
// Client components import only the MenuItem type from here.

/** One menu item, as the app uses it. Money is in cents. */
export type MenuItem = {
  /** Like "iced-latte". Never changes, even when the item is renamed: past orders refer to it. */
  id: string;
  name: string;
  /** One short sentence shown in the item's options popup. Can be empty. */
  description: string;
  /** Matches a category id in categories.ts. */
  categoryId: string;
  /** Price in cents, so 650 is $6.50. Whole numbers avoid rounding errors. For drinks, this is the Medium price. */
  price: number;
  /** "/menu/coffee/iced-latte.png" (a file under public/) or a full web address. null: no photo yet. */
  image: string | null;
  /** Off: hidden from the Register, but kept so it can be switched back on. */
  isOnMenu: boolean;
};

const MENU_COLUMNS = "id, name, description, category_id, price_cents, image, is_on_menu";

/** The shape Supabase sends back for MENU_COLUMNS (database names, snake_case). */
type MenuItemRow = {
  id: string;
  name: string;
  description: string;
  category_id: string;
  price_cents: number;
  image: string | null;
  is_on_menu: boolean;
};

/**
 * The items on the menu, in the order the Register shows them: by category
 * (the rail's order), then each category's own order.
 * Returns null if Supabase couldn't be reached or refused.
 */
export function getMenu(): Promise<MenuItem[] | null> {
  return loadMenu({ onlyOnMenu: true });
}

/**
 * Every item, including those taken off the menu, in the same order as
 * getMenu(). For the Menu page, where admins switch them back on.
 * Returns null if Supabase couldn't be reached or refused.
 */
export function getAllMenuItems(): Promise<MenuItem[] | null> {
  return loadMenu({ onlyOnMenu: false });
}

async function loadMenu({ onlyOnMenu }: { onlyOnMenu: boolean }): Promise<MenuItem[] | null> {
  const supabase = await createClient();

  let request = supabase.from("menu_items").select(MENU_COLUMNS);
  if (onlyOnMenu) request = request.eq("is_on_menu", true);

  const { data, error } = await request
    .order("sort_order", { ascending: true })
    // Two items with the same place: A to Z.
    .order("name", { ascending: true })
    // Supabase doesn't know our tables' types, so tell it what comes back.
    .overrideTypes<MenuItemRow[], { merge: false }>();

  if (error) {
    console.error("Loading the menu failed:", error.message);
    return null;
  }

  // The database sorted each category's items; this puts the categories in
  // the rail's order. sort() keeps the order of items it treats as equal.
  return data
    .map(toMenuItem)
    .sort((a, b) => categoryPosition(a.categoryId) - categoryPosition(b.categoryId));
}

/**
 * The items with these ids, whether they're on the menu or not (isOnMenu
 * says), for checking a bill before it's saved. Ids that don't exist are
 * simply missing from the result.
 * Returns null if Supabase couldn't be reached or refused.
 */
export async function getMenuItemsByIds(ids: string[]): Promise<MenuItem[] | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("menu_items")
    .select(MENU_COLUMNS)
    .in("id", ids)
    .overrideTypes<MenuItemRow[], { merge: false }>();

  if (error) {
    console.error("Loading menu items failed:", error.message);
    return null;
  }

  return data.map(toMenuItem);
}

// Where a category sits on the rail. An unknown one goes last.
function categoryPosition(categoryId: string): number {
  const index = categories.findIndex((category) => category.id === categoryId);
  return index === -1 ? categories.length : index;
}

// Database names (snake_case) to the app's names (camelCase).
function toMenuItem(row: MenuItemRow): MenuItem {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    categoryId: row.category_id,
    price: row.price_cents,
    image: row.image,
    isOnMenu: row.is_on_menu,
  };
}
