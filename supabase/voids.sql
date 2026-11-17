-- Cafe POS database: voided orders.
--
-- How to run: Supabase dashboard → SQL Editor → New query → paste this whole
-- file → Run. It's safe to run again: it skips what already exists.
-- Run schema.sql and profiles.sql first: this file uses their orders table
-- and is_admin() function.
--
-- A void cancels a paid order without deleting it. The order stays in
-- history, marked voided, with who voided it, when and why, and it no longer
-- counts as a sale. The rules (the app checks them too):
--   - Only admins can void.
--   - Only orders from today, on the cafe's clock (Manila time).
--   - The whole order, and only once. A void can't be changed or undone.
--   - A reason is required.


-- ============================================================================
-- 1. order_voids: one row per voided order
-- ============================================================================
-- The orders table doesn't change. A void is a new row next to the order, so
-- paid orders still never change after they're saved.

create table if not exists public.order_voids (
  -- The voided order. As the primary key, it can only appear once, so an
  -- order can't be voided twice.
  order_id uuid primary key references public.orders (id) on delete cascade,

  -- "Wrong item", "Charged twice"... or the admin's own words for "Other".
  reason text not null check (btrim(reason) <> '' and char_length(reason) <= 200),

  -- Who voided it. Filled in by the database from the signed-in user.
  -- If that staff account is ever deleted, the void stays and this goes empty.
  voided_by uuid default auth.uid() references auth.users (id) on delete set null,
  -- Their name at the time, the same idea as orders.cashier_name.
  voided_by_name text not null,

  voided_at timestamptz not null default now()
);


-- ============================================================================
-- 2. Who can do what (Row Level Security)
-- ============================================================================
-- All signed-in staff can read voids, so everyone sees which orders were
-- voided. Only admins can add one, and only for today's orders. There are no
-- update or delete policies, so a void can't be changed or undone.

alter table public.order_voids enable row level security;

revoke all on public.order_voids from anon, authenticated;
grant select on public.order_voids to authenticated;
-- Only these three columns can be sent. Who voided it and when are always
-- filled in by the database, so nobody can void under someone else's account
-- or pretend it happened at another time.
grant insert (order_id, reason, voided_by_name) on public.order_voids to authenticated;

drop policy if exists "Staff can read voids" on public.order_voids;
create policy "Staff can read voids"
  on public.order_voids for select
  to authenticated
  using (true);

drop policy if exists "Admins can void today's orders" on public.order_voids;
create policy "Admins can void today's orders"
  on public.order_voids for insert
  to authenticated
  with check (
    (select public.is_admin())
    and voided_by = (select auth.uid())
    -- The order was paid today on the cafe's clock. "at time zone" turns
    -- both moments into Manila clock time before taking the date. Keep the
    -- zone the same as CAFE_TIME_ZONE in lib/cafe-time.ts.
    and exists (
      select 1
      from public.orders
      where orders.id = order_voids.order_id
        and (orders.created_at at time zone 'Asia/Manila')::date
          = (now() at time zone 'Asia/Manila')::date
    )
  );
