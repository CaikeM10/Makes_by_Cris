begin;
-- Only SELECT is added. Existing administrator policies/grants are retained.
grant select on public.categories, public.products to anon;
create policy categories_public_read on public.categories
  for select to anon, authenticated using (active = true);
create policy products_public_read on public.products
  for select to anon, authenticated using (
    active = true and exists (
      select 1 from public.categories c where c.id = products.category_id and c.active = true
    )
  );
commit;
