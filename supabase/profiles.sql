-- Cafe POS database: staff roles (admin or cashier).
--
-- How to run: Supabase dashboard → SQL Editor → New query → paste this whole
-- file → Run. It's safe to run again: it skips what already exists.
-- It doesn't need schema.sql, so the two can run in either order.
--
-- Staff accounts are made in the Supabase dashboard (Authentication → Users),
-- never in the app. Each new account gets a profile row automatically (see the
-- trigger below), starting as a cashier.
--
-- Each profile keeps a copy of the account's email, so you can tell the rows
-- apart in the Table Editor. The app doesn't use it. If you ever change an
-- account's email in Authentication → Users, change it here too.
--
-- To make someone an admin: Table Editor → profiles → change their role to
-- "admin". The app can only read roles. It can't add, change or delete them,
-- not even for an admin.


-- ============================================================================
-- 1. profiles: one row per staff account
-- ============================================================================

create table if not exists public.profiles (
  -- The same id as the staff account. If the account is deleted, its profile
  -- goes too.
  id uuid primary key references auth.users (id) on delete cascade,
  -- A copy of the account's email, only so you can tell the rows apart.
  email text,
  role text not null default 'cashier' check (role in ('admin', 'cashier')),
  created_at timestamptz not null default now()
);


-- ============================================================================
-- 2. Who can do what (Row Level Security)
-- ============================================================================
-- Signed-in staff can read only their own profile. There are no insert,
-- update or delete policies, so the app can't add, change or delete any row.
-- The dashboard isn't limited by these rules, so you can still edit roles there.

alter table public.profiles enable row level security;

revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;

drop policy if exists "Staff can read their own profile" on public.profiles;
create policy "Staff can read their own profile"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()));


-- ============================================================================
-- 3. A new account gets a cashier profile
-- ============================================================================
-- Runs each time an account is added to auth.users (when you create staff in
-- the dashboard). "security definer" runs it as the database owner, because
-- nobody else can add profile rows.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;

  return new;
end;
$$;

-- Only the trigger runs it. Nobody can call it from the app.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ============================================================================
-- 4. Accounts made before this table existed get a cashier profile too
-- ============================================================================

insert into public.profiles (id, email)
select id, email from auth.users
on conflict (id) do nothing;


-- ============================================================================
-- 5. is_admin(): is the signed-in user an admin?
-- ============================================================================
-- For later features (voids, end-of-day, menu management): their RLS policies
-- can say "using (public.is_admin())", so the database itself blocks
-- cashiers, not just the app's screens.
--
-- "security invoker" runs it as the signed-in user. That works because
-- everyone can read their own profile. With no profile row, the answer is
-- false, so the user counts as a cashier.

create or replace function public.is_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  );
$$;

revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;
