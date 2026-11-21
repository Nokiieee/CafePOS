-- Cafe POS: menu photos, in Supabase Storage.
--
-- How to run: Supabase dashboard → SQL Editor → New query → paste this whole
-- file → Run. It's safe to run again.
-- Run profiles.sql and menu.sql first: this file uses is_admin(), and the
-- photos belong to menu_items.
--
-- Storage holds files, the way the database holds rows. This makes one
-- folder (a "bucket") called menu-photos, for the photos admins upload on
-- the Menu page. Each item's row in menu_items keeps its photo's web address.
-- The 17 starting photos aren't here: they stay in the app, under public/menu/.
--
-- The rules:
--   - Anyone with a photo's address can see it (the bucket is public), so
--     the Register can show it like any picture on the web.
--   - Only admins can upload or delete photos.
--   - Photos are JPEG, PNG or WebP, up to 1 MB. The app always uploads an
--     800 × 800 JPEG, which is far smaller than that.
-- You can see every uploaded photo in the dashboard: Storage → menu-photos.


-- ============================================================================
-- 1. The menu-photos bucket
-- ============================================================================
-- Running this again updates the bucket's settings instead of failing.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('menu-photos', 'menu-photos', true, 1048576, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;


-- ============================================================================
-- 2. Who can do what (Row Level Security on Storage's files)
-- ============================================================================
-- Storage keeps every bucket's files in one table, storage.objects, so each
-- rule names the bucket. Seeing a photo through its address doesn't need a
-- rule (the bucket is public). Deleting one needs the "see" rule too, which
-- is why staff get it here.

drop policy if exists "Staff can see menu photos" on storage.objects;
create policy "Staff can see menu photos"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'menu-photos');

drop policy if exists "Admins can upload menu photos" on storage.objects;
create policy "Admins can upload menu photos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'menu-photos' and (select public.is_admin()));

-- When an admin replaces or removes a photo, the app deletes the old file.
drop policy if exists "Admins can delete menu photos" on storage.objects;
create policy "Admins can delete menu photos"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'menu-photos' and (select public.is_admin()));
