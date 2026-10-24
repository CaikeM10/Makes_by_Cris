begin;

-- Supported bucket configuration; object lifecycle uses the Storage API only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = excluded.public,
  file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Public downloads need no SELECT policy. Admin SELECT enables API cleanup.
create policy product_images_admin_select on storage.objects
for select to authenticated using (bucket_id = 'product-images' and (select public.is_admin()));
create policy product_images_admin_insert on storage.objects
for insert to authenticated with check (
  bucket_id = 'product-images' and (select public.is_admin())
  and name ~ '^products/[a-zA-Z0-9_-]{1,100}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$'
);
-- Replacement always INSERTs a fresh UUID object with upsert:false. No UPDATE grant.
create policy product_images_admin_delete on storage.objects
for delete to authenticated using (bucket_id = 'product-images' and (select public.is_admin()));

-- products_admin_insert/update already exist (202610230001); no product DELETE.
commit;
