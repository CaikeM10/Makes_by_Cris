begin;
create table public.categories (
  id text primary key check (length(id) between 1 and 100),
  name text not null check (length(btrim(name)) between 1 and 200),
  slug text not null unique,
  description text not null default '',
  image text not null default '',
  active boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.products (
  id text primary key check (length(id) between 1 and 100),
  name text not null check (length(btrim(name)) between 1 and 200),
  slug text not null unique,
  short_description text not null check (length(btrim(short_description)) between 1 and 500),
  description text not null check (length(btrim(description)) between 1 and 10000),
  price numeric(12,2) not null check (price >= 0 and price <> 'NaN'::numeric),
  credit_price numeric(12,2) not null check (credit_price >= 0 and credit_price <> 'NaN'::numeric),
  image text not null,
  category_id text not null references public.categories(id) on delete restrict,
  brand text not null check (length(btrim(brand)) between 1 and 120),
  keywords text[] not null default '{}',
  variations text[],
  featured boolean not null default false,
  best_seller boolean not null default false,
  gift_section boolean not null default false,
  available boolean not null default true,
  active boolean not null default true,
  catalog_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_category_idx on public.products(category_id);
create index products_order_idx on public.products(catalog_order, id);
create function public.catalog_touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := greatest(clock_timestamp(), old.updated_at + interval '1 microsecond');
  return new;
end;
$$;
revoke all on function public.catalog_touch_updated_at() from public, anon, authenticated;
create trigger categories_updated_at before update on public.categories for each row execute function public.catalog_touch_updated_at();
create trigger products_updated_at before update on public.products for each row execute function public.catalog_touch_updated_at();
alter table public.categories enable row level security;
alter table public.products enable row level security;
revoke all on public.categories, public.products from public, anon, authenticated;
grant select, insert, update on public.categories, public.products to authenticated;
create policy categories_admin_read on public.categories for select to authenticated using ((select public.is_admin()));
create policy categories_admin_insert on public.categories for insert to authenticated with check ((select public.is_admin()));
create policy categories_admin_update on public.categories for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy products_admin_read on public.products for select to authenticated using ((select public.is_admin()));
create policy products_admin_insert on public.products for insert to authenticated with check ((select public.is_admin()));
create policy products_admin_update on public.products for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
commit;
