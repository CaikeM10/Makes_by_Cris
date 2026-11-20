-- Manual editorial priority for Novidades; existing products remain unmarked.
alter table public.products
  add column if not exists new_arrival boolean not null default false;
