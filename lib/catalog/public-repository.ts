import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Category } from "@/lib/types";
import { mapPublicProduct, type PublicProductRow } from "./mappers";
import type { PublicCatalog } from "./public-catalog";

export const PUBLIC_PRODUCT_COLUMNS = "id,name,slug,short_description,description,price,credit_price,image,category_id,brand,keywords,variations,featured,best_seller,gift_section,available,active,created_at";
export const PUBLIC_CATEGORY_COLUMNS = "id,name,slug,description,image,active";

/** Explicit public filters also apply when the current visitor is an admin. */
export async function readPublicCatalog(client: SupabaseClient): Promise<PublicCatalog> {
  const categoryResult = await client.from("categories").select(PUBLIC_CATEGORY_COLUMNS).eq("active", true).order("position").order("id");
  if (categoryResult.error) throw new Error("Não foi possível carregar o catálogo.");
  const categories = (categoryResult.data ?? []) as Category[];
  if (!categories.length) return { categories, products: [] };
  const byId = new Map(categories.map(c => [c.id, c]));
  const products: PublicCatalog["products"] = [];
  // Range pagination avoids silently truncating the store at PostgREST's row limit.
  const batch = 500;
  for (let offset = 0; ; offset += batch) {
    const { data, error } = await client.from("products").select(PUBLIC_PRODUCT_COLUMNS)
      .eq("active", true).in("category_id", categories.map(c => c.id))
      .order("catalog_order").order("id").range(offset, offset + batch - 1);
    if (error) throw new Error("Não foi possível carregar o catálogo.");
    const rows = (data ?? []) as PublicProductRow[];
    for (const row of rows) {
      const category = byId.get(row.category_id);
      if (row.active && category?.active) products.push(mapPublicProduct(row, category));
    }
    if (rows.length < batch) break;
  }
  return { categories, products };
}
