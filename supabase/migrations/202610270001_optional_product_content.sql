-- Keep unknown content as NULL; existing length checks still validate supplied text.
alter table public.products
  alter column brand drop not null,
  alter column short_description drop not null,
  alter column description drop not null;
