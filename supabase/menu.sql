-- Cafe POS database: the menu.
--
-- How to run: Supabase dashboard → SQL Editor → New query → paste this whole
-- file → Run. It's safe to run again: it skips what already exists, and it
-- never overwrites items that are already there (so it won't undo price
-- changes made in the app).
-- Run profiles.sql first: this file uses its is_admin() function.
--
-- The menu used to live in the app's code (components/pos/menu-items.ts).
-- Now it's this table, so admins can change it in the app without a new
-- deploy. The rules (the app checks them too):
--   - All signed-in staff can read the menu. Only admins can add or edit items.
--   - Items are never deleted. Taking one off the menu switches is_on_menu
--     off: the Register stops showing it, and it can be switched back on.
--   - An item's id never changes, even when it's renamed, because past
--     orders and the summary refer to it.
--
-- Changing the menu never changes past orders: each order line keeps its own
-- copy of the name and price from the moment of sale (order_items, schema.sql).


-- ============================================================================
-- 1. menu_items: one row per item
-- ============================================================================

create table if not exists public.menu_items (
  -- A short name made from the item's name, like "iced-latte": lowercase
  -- letters and numbers, joined by dashes. Set once, never changed.
  id text primary key
    check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(id) <= 60),

  name text not null check (btrim(name) <> '' and char_length(name) <= 60),
  -- One short sentence, shown in the item's options popup. Can be empty.
  description text not null default '' check (char_length(description) <= 200),

  -- The categories are fixed in the app (components/pos/categories.ts). Keep
  -- this list the same as the ids there ("all" isn't a real category).
  -- "coffee" items get the Size, Sugar and Ice options.
  category_id text not null check (category_id in ('coffee', 'sides', 'pasta')),

  -- In cents, so 650 is $6.50. For coffee, this is the Medium price; Small
  -- and Large are worked out in the app (item-options.ts). Up to $999.99.
  price_cents integer not null check (price_cents between 1 and 99999),

  -- Where the photo is: a file in the app ("/menu/coffee/iced-latte.png",
  -- under public/) or a full web address. Empty: no photo yet.
  image text check (char_length(image) <= 500),

  -- Off: hidden from the Register, but kept, so it can be switched back on.
  is_on_menu boolean not null default true,

  -- The order within its category on the Register: smallest first.
  sort_order integer not null default 0,

  created_at timestamptz not null default now()
);


-- ============================================================================
-- 2. Who can do what (Row Level Security)
-- ============================================================================
-- All signed-in staff can read the whole menu (the Register shows only the
-- items that are on it). Only admins can add or edit. There's no delete
-- policy or grant, so items can't be deleted, not even by an admin.

alter table public.menu_items enable row level security;

revoke all on public.menu_items from anon, authenticated;
grant select on public.menu_items to authenticated;
-- The id can be sent when adding an item, but not when editing one.
grant insert (id, name, description, category_id, price_cents, image, is_on_menu, sort_order)
  on public.menu_items to authenticated;
grant update (name, description, category_id, price_cents, image, is_on_menu, sort_order)
  on public.menu_items to authenticated;

drop policy if exists "Staff can read the menu" on public.menu_items;
create policy "Staff can read the menu"
  on public.menu_items for select
  to authenticated
  using (true);

drop policy if exists "Admins can add menu items" on public.menu_items;
create policy "Admins can add menu items"
  on public.menu_items for insert
  to authenticated
  with check ((select public.is_admin()));

drop policy if exists "Admins can edit menu items" on public.menu_items;
create policy "Admins can edit menu items"
  on public.menu_items for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));


-- ============================================================================
-- 3. The starting menu
-- ============================================================================
-- The 17 items that used to be in menu-items.ts, with the same ids, so past
-- orders still match them. "on conflict do nothing" skips any item that's
-- already in the table, so running this file again never undoes an edit.
-- The photos stay where they are, in public/menu/.

insert into public.menu_items (id, name, description, category_id, price_cents, image, sort_order)
values
  -- Coffee
  ('iced-latte', 'Iced Latte', 'Espresso and cold milk poured over ice.', 'coffee', 600, '/menu/coffee/iced-latte.png', 10),
  ('iced-hazelnut-latte', 'Iced Hazelnut Latte', 'Espresso, hazelnut syrup and cold milk over ice.', 'coffee', 650, '/menu/coffee/iced-hazelnut-latte.png', 20),
  ('iced-honey-oat-latte', 'Iced Honey Oat Latte', 'Espresso and oat milk sweetened with honey, over ice.', 'coffee', 675, '/menu/coffee/iced-honey-oat-latte.png', 30),
  ('caramel-macchiato', 'Caramel Macchiato', 'Vanilla milk and espresso over ice, finished with caramel drizzle.', 'coffee', 650, '/menu/coffee/caramel-macchiato.png', 40),
  ('iced-mocha', 'Iced Mocha', 'Espresso, chocolate sauce and milk over ice.', 'coffee', 650, '/menu/coffee/iced-mocha.png', 50),
  ('iced-americano', 'Iced Americano', 'Espresso topped with cold water and ice.', 'coffee', 500, '/menu/coffee/iced-americano.png', 60),
  ('iced-long-black', 'Iced Long Black', 'A double shot of espresso over cold water and ice.', 'coffee', 550, '/menu/coffee/iced-long-black.png', 70),
  ('cold-brew', 'Cold Brew', 'Coffee steeped cold for hours, smooth and low in bitterness.', 'coffee', 600, '/menu/coffee/cold-brew.png', 80),
  ('vanilla-cream-cold-brew', 'Vanilla Cream Cold Brew', 'Cold brew topped with sweet vanilla cream.', 'coffee', 675, '/menu/coffee/vanilla-cream-cold-brew.png', 90),
  -- Sides
  ('fries', 'Fries', 'Crispy golden fries, lightly salted.', 'sides', 450, '/menu/sides/fries.png', 10),
  ('onion-rings', 'Onion Rings', 'Thick onion rings in a crunchy golden batter.', 'sides', 500, '/menu/sides/onion-rings.png', 20),
  ('cheesy-garlic-bread', 'Cheesy Garlic Bread', 'Toasted garlic butter bread under melted cheese.', 'sides', 500, '/menu/sides/cheesy-garlic-bread.png', 30),
  ('banana-bread', 'Banana Bread', 'A thick, moist slice of banana bread.', 'sides', 400, '/menu/sides/banana-bread.png', 40),
  -- Pasta
  ('spaghetti-bolognese', 'Spaghetti Bolognese', 'Spaghetti in a rich beef and tomato sauce, topped with parmesan.', 'pasta', 1200, '/menu/pasta/spaghetti-bolognese.png', 10),
  ('chicken-mushroom-penne', 'Chicken Mushroom Penne', 'Penne with chicken and mushrooms in a creamy sauce.', 'pasta', 1300, '/menu/pasta/chicken-mushroom-penne.png', 20),
  ('aglio-e-olio', 'Aglio e Olio', 'Spaghetti tossed in olive oil, garlic and chili flakes.', 'pasta', 1050, '/menu/pasta/aglio-e-olio.png', 30),
  ('baked-mac-cheese', 'Baked Mac & Cheese', 'Macaroni in a creamy cheese sauce, baked until golden on top.', 'pasta', 1150, '/menu/pasta/baked-mac-cheese.png', 40)
on conflict (id) do nothing;
