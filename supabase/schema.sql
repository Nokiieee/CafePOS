-- Cafe POS database: paid orders and the items in them.
--
-- How to run: Supabase dashboard → SQL Editor → New query → paste this whole
-- file → Run. It's safe to run again: it skips what already exists.
-- (If a table changes later, "create table if not exists" won't change it.
-- That will need its own small "alter table" script.)
--
-- Money is in cents (650 = $6.50), the same as in the app.


-- ============================================================================
-- 1. orders: one row per paid bill
-- ============================================================================

create table if not exists public.orders (
  -- Made by the app when Charge opens, so a double tap or a retry sends the
  -- same id, and the order can't be saved twice.
  id uuid primary key default gen_random_uuid(),

  -- Who took the payment. Filled in by the database from the signed-in user.
  -- If that staff account is ever deleted, the order stays and this goes empty.
  cashier_id uuid default auth.uid() references auth.users (id) on delete set null,
  -- The cashier's name at the time, so order history can show it without
  -- reading the private auth.users table.
  cashier_name text not null,

  order_type text not null check (order_type in ('dine-in', 'take-out')),

  total_cents integer not null check (total_cents > 0),
  cash_received_cents integer not null,
  -- Worked out by the database, so it can never disagree with the two above.
  change_cents integer generated always as (cash_received_cents - total_cents) stored,

  created_at timestamptz not null default now(),

  constraint orders_cash_covers_total check (cash_received_cents >= total_cents)
);

-- Order history and end-of-day totals look up orders by time, newest first.
create index if not exists orders_created_at_idx on public.orders (created_at desc);


-- ============================================================================
-- 2. order_items: one row per bill line
-- ============================================================================

create table if not exists public.order_items (
  order_id uuid not null references public.orders (id) on delete cascade,
  -- The line's place on the bill: 1, 2, 3... It starts at 1 for every order,
  -- and keeps receipts in the same order as the bill.
  line_no smallint not null check (line_no > 0),

  -- The menu lives in the app's code (menu-items.ts), not in the database.
  -- item_id is its id there, like "iced-latte". The name and price are copies
  -- from the moment of sale, so old orders stay right if the menu changes.
  item_id text not null,
  name text not null,

  -- Drink options. All three are empty for items without options (sides, pasta).
  size text check (size in ('small', 'medium', 'large')),
  sugar smallint check (sugar in (0, 25, 50, 75, 100)),
  ice text check (ice in ('Less', 'Normal', 'Extra')),

  -- The price of one, with the size change already applied.
  unit_price_cents integer not null check (unit_price_cents > 0),
  quantity integer not null check (quantity between 1 and 99),
  line_total_cents integer generated always as (unit_price_cents * quantity) stored,

  -- "Order a3f9, line 2" points to exactly one row.
  primary key (order_id, line_no),

  -- A drink has all three options, or none of them.
  constraint order_items_options_together check (
    (size is null and sugar is null and ice is null)
    or (size is not null and sugar is not null and ice is not null)
  )
);


-- ============================================================================
-- 3. Who can do what (Row Level Security)
-- ============================================================================
-- With RLS on, nobody can read or write a row unless a policy allows it.
-- Signed-out visitors ("anon") get nothing. Signed-in staff can read all
-- orders (for order history later) and add orders as themselves.
-- Nobody can edit or delete a paid order: there are no update/delete policies.

alter table public.orders enable row level security;
alter table public.order_items enable row level security;

revoke all on public.orders, public.order_items from anon, authenticated;
grant select, insert on public.orders, public.order_items to authenticated;

drop policy if exists "Staff can read orders" on public.orders;
create policy "Staff can read orders"
  on public.orders for select
  to authenticated
  using (true);

drop policy if exists "Staff can add their own orders" on public.orders;
create policy "Staff can add their own orders"
  on public.orders for insert
  to authenticated
  with check (cashier_id = (select auth.uid()));

drop policy if exists "Staff can read order items" on public.order_items;
create policy "Staff can read order items"
  on public.order_items for select
  to authenticated
  using (true);

drop policy if exists "Staff can add items to their own orders" on public.order_items;
create policy "Staff can add items to their own orders"
  on public.order_items for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.orders
      where orders.id = order_items.order_id
        and orders.cashier_id = (select auth.uid())
    )
  );


-- ============================================================================
-- 4. create_order: saves an order and its items together
-- ============================================================================
-- The app calls this once per payment. Everything inside a function runs as
-- one transaction: if any item fails, the order isn't saved either, so there's
-- never an order with missing items.
--
-- p_items is a JSON list, in bill order:
--   [{ "item_id": "iced-latte", "name": "Iced Latte", "size": "large",
--      "sugar": 50, "ice": "Less", "unit_price_cents": 675, "quantity": 2 },
--    { "item_id": "fries", "name": "Fries", "size": null, "sugar": null,
--      "ice": null, "unit_price_cents": 350, "quantity": 1 }]
--
-- The total is added up here from the items, not sent separately, so it
-- always matches them. Returns the order's id.
--
-- "security invoker" means it runs as the signed-in cashier, so the RLS
-- policies above still apply.

create or replace function public.create_order(
  p_order_id uuid,
  p_cashier_name text,
  p_order_type text,
  p_cash_received_cents integer,
  p_items jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_total integer;
begin
  if p_items is null
    or jsonb_typeof(p_items) <> 'array'
    or jsonb_array_length(p_items) = 0 then
    raise exception 'An order needs at least one item';
  end if;

  select sum((item ->> 'unit_price_cents')::integer * (item ->> 'quantity')::integer)
    into v_total
    from jsonb_array_elements(p_items) as item;

  insert into public.orders (id, cashier_name, order_type, total_cents, cash_received_cents)
  values (p_order_id, p_cashier_name, p_order_type, v_total, p_cash_received_cents)
  on conflict (id) do nothing;

  -- Nothing was added, so this order is already saved (a double tap or a
  -- retry). Don't add its items a second time.
  if not found then
    return p_order_id;
  end if;

  -- "with ordinality" numbers the list 1, 2, 3..., which becomes line_no.
  insert into public.order_items
    (order_id, line_no, item_id, name, size, sugar, ice, unit_price_cents, quantity)
  select
    p_order_id,
    line.line_no,
    line.item ->> 'item_id',
    line.item ->> 'name',
    line.item ->> 'size',
    (line.item ->> 'sugar')::smallint,
    line.item ->> 'ice',
    (line.item ->> 'unit_price_cents')::integer,
    (line.item ->> 'quantity')::integer
  from jsonb_array_elements(p_items) with ordinality as line (item, line_no);

  return p_order_id;
end;
$$;

-- Only signed-in staff can call it.
revoke execute on function public.create_order(uuid, text, text, integer, jsonb) from public, anon;
grant execute on function public.create_order(uuid, text, text, integer, jsonb) to authenticated;
