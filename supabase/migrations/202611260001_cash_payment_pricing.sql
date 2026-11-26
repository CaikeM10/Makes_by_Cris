alter table public.products
  add column cash_price numeric(12,2) null,
  add constraint products_cash_price_positive
    check (cash_price is null or (cash_price > 0 and cash_price <> 'NaN'::numeric));
