begin;

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 200),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 150),
  title text not null check (length(btrim(title)) between 1 and 200),
  description text not null default '' check (length(description) <= 2000),
  button_text text not null check (length(btrim(button_text)) between 1 and 80),
  desktop_image_path text not null default '',
  mobile_image_path text not null default '',
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (desktop_image_path = '' or desktop_image_path ~ ('^campaigns/' || id::text || '/desktop/[0-9a-f-]{36}\.(webp|jpg|png)$')),
  check (mobile_image_path = '' or mobile_image_path ~ ('^campaigns/' || id::text || '/mobile/[0-9a-f-]{36}\.(webp|jpg|png)$'))
);
create unique index if not exists campaigns_one_active on public.campaigns ((true)) where active;
create table if not exists public.campaign_products (
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  product_id text not null references public.products(id) on delete restrict,
  position integer not null check (position >= 0),
  primary key (campaign_id, product_id),
  unique (campaign_id, position)
);
drop trigger if exists campaigns_updated_at on public.campaigns;
create trigger campaigns_updated_at before update on public.campaigns
for each row execute function public.catalog_touch_updated_at();

-- Existing mocks have legacy, non-UUID identifiers. Admin1 is excluded explicitly,
-- even if somebody later reactivates it. No products are changed by this migration.
create or replace function public.campaign_product_is_eligible(p_id text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.products p join public.categories c on c.id = p.category_id
    where p.id = p_id and p.active and p.available and c.active
    and p.id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and lower(btrim(p.name)) <> 'produto teste admin1');
$$;
create or replace function public.campaign_is_public(p_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.campaigns c where c.id = p_id and c.active
    and c.desktop_image_path <> '' and c.mobile_image_path <> ''
    and exists(select 1 from public.campaign_products cp
      where cp.campaign_id = c.id and public.campaign_product_is_eligible(cp.product_id)));
$$;
revoke all on function public.campaign_product_is_eligible(text), public.campaign_is_public(uuid) from public;
grant execute on function public.campaign_product_is_eligible(text), public.campaign_is_public(uuid) to anon, authenticated;

alter table public.campaigns enable row level security;
alter table public.campaign_products enable row level security;
revoke all on public.campaigns, public.campaign_products from public, anon, authenticated;
grant select on public.campaigns, public.campaign_products to anon, authenticated;
drop policy if exists campaigns_public_read on public.campaigns;
create policy campaigns_public_read on public.campaigns for select to anon, authenticated
using (public.campaign_is_public(id));
drop policy if exists campaigns_admin_read on public.campaigns;
create policy campaigns_admin_read on public.campaigns for select to authenticated using ((select public.is_admin()));
drop policy if exists campaign_products_public_read on public.campaign_products;
create policy campaign_products_public_read on public.campaign_products for select to anon, authenticated
using (public.campaign_is_public(campaign_id) and public.campaign_product_is_eligible(product_id));
drop policy if exists campaign_products_admin_read on public.campaign_products;
create policy campaign_products_admin_read on public.campaign_products for select to authenticated using ((select public.is_admin()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('campaign-banners', 'campaign-banners', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists campaign_banners_public_read on storage.objects;
create policy campaign_banners_public_read on storage.objects for select to anon, authenticated using (
  bucket_id = 'campaign-banners' and exists(select 1 from public.campaigns c
    where public.campaign_is_public(c.id) and storage.objects.name in (c.desktop_image_path, c.mobile_image_path))
);
drop policy if exists campaign_banners_admin_read on storage.objects;
create policy campaign_banners_admin_read on storage.objects for select to authenticated
using (bucket_id = 'campaign-banners' and (select public.is_admin()));
drop policy if exists campaign_banners_admin_insert on storage.objects;
create policy campaign_banners_admin_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'campaign-banners' and (select public.is_admin())
  and name ~ '^campaigns/[0-9a-f-]{36}/(desktop|mobile)/[0-9a-f-]{36}\.(webp|jpg|png)$'
);
-- No overwrite policy. A referenced object cannot be removed, even after an
-- ambiguous save response. Old images are cleaned only after the new reference commits.
drop policy if exists campaign_banners_admin_delete on storage.objects;
create policy campaign_banners_admin_delete on storage.objects for delete to authenticated using (
  bucket_id = 'campaign-banners' and (select public.is_admin())
  and not exists(select 1 from public.campaigns c where storage.objects.name in (c.desktop_image_path, c.mobile_image_path))
);

-- All editorial writes go through authenticated RPCs: validation, associations,
-- optimistic concurrency and activation happen together. Direct table writes are
-- intentionally not granted, including to admins, to prevent invariant bypass.
create or replace function public.save_campaign(p_id uuid, p_version timestamptz, p_fields jsonb, p_product_ids text[], p_active boolean)
returns uuid language plpgsql security definer set search_path = '' as $$
declare old_row public.campaigns; desktop text; mobile text;
begin
  if not public.is_admin() then raise exception 'campaign-forbidden' using errcode = '42501'; end if;
  perform pg_advisory_xact_lock(73103101);
  select * into old_row from public.campaigns where id = p_id for update;
  if (found and (p_version is null or old_row.updated_at <> p_version)) or (not found and p_version is not null)
    then raise exception 'campaign-conflict'; end if;
  if p_product_ids is null or cardinality(p_product_ids) > 500
    or cardinality(p_product_ids) <> (select count(distinct x) from unnest(p_product_ids) x)
    or exists(select 1 from unnest(p_product_ids) x where not public.campaign_product_is_eligible(x))
    then raise exception 'campaign-invalid-products'; end if;
  desktop := coalesce(p_fields->>'desktop_image_path',''); mobile := coalesce(p_fields->>'mobile_image_path','');
  if desktop <> '' and not exists(select 1 from storage.objects where bucket_id='campaign-banners' and name=desktop)
    then raise exception 'campaign-desktop-missing'; end if;
  if mobile <> '' and not exists(select 1 from storage.objects where bucket_id='campaign-banners' and name=mobile)
    then raise exception 'campaign-mobile-missing'; end if;
  if p_active and (desktop = '' or mobile = '' or cardinality(p_product_ids) = 0)
    then raise exception 'campaign-not-ready'; end if;
  if p_active then update public.campaigns set active=false where active and id<>p_id; end if;
  insert into public.campaigns(id,name,slug,title,description,button_text,desktop_image_path,mobile_image_path,active)
  values(p_id,btrim(p_fields->>'name'),p_fields->>'slug',btrim(p_fields->>'title'),coalesce(p_fields->>'description',''),
    btrim(p_fields->>'button_text'),desktop,mobile,p_active)
  on conflict(id) do update set name=excluded.name,slug=excluded.slug,title=excluded.title,description=excluded.description,
    button_text=excluded.button_text,desktop_image_path=excluded.desktop_image_path,mobile_image_path=excluded.mobile_image_path,active=excluded.active;
  delete from public.campaign_products where campaign_id=p_id;
  insert into public.campaign_products(campaign_id,product_id,position)
    select p_id,x,ordinality::integer-1 from unnest(p_product_ids) with ordinality as ids(x,ordinality);
  return p_id;
end;
$$;
create or replace function public.set_campaign_active(p_id uuid,p_version timestamptz,p_active boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare c public.campaigns; ids text[];
begin
  if not public.is_admin() then raise exception 'campaign-forbidden' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(73103101);
  select * into c from public.campaigns where id=p_id;
  if not found or p_version is null or c.updated_at<>p_version then raise exception 'campaign-conflict'; end if;
  -- Deactivation must remain possible even after a selected product is disabled.
  if not p_active then update public.campaigns set active=false where id=p_id; return; end if;
  select coalesce(array_agg(product_id order by position),'{}'::text[]) into ids
    from public.campaign_products where campaign_id=p_id and public.campaign_product_is_eligible(product_id);
  perform public.save_campaign(p_id,p_version,to_jsonb(c),ids,true);
end;
$$;
create or replace function public.delete_campaign(p_id uuid,p_version timestamptz)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'campaign-forbidden' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(73103101);
  delete from public.campaigns where id=p_id and updated_at=p_version;
  if not found then raise exception 'campaign-conflict'; end if;
end;
$$;
revoke all on function public.save_campaign(uuid,timestamptz,jsonb,text[],boolean),
  public.set_campaign_active(uuid,timestamptz,boolean), public.delete_campaign(uuid,timestamptz) from public,anon;
grant execute on function public.save_campaign(uuid,timestamptz,jsonb,text[],boolean),
  public.set_campaign_active(uuid,timestamptz,boolean), public.delete_campaign(uuid,timestamptz) to authenticated;

commit;
