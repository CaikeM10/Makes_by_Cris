import type { AdminProduct, ProductRow } from "./repository";

export function mapProduct(row: ProductRow): AdminProduct {
  return { ...row, price: Number(row.price).toFixed(2), credit_price: Number(row.credit_price).toFixed(2) };
}
