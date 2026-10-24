import type { AdminProduct, ProductRow } from "./repository";
import type { Category, Product } from "@/lib/types";

export type PublicProduct = Product & { giftSection: boolean };
export type PublicProductRow = Omit<ProductRow, "updated_at" | "catalog_order">;
export function mapPublicProduct(row: PublicProductRow, category: Category): PublicProduct {
  return {
    id: row.id, name: row.name, slug: row.slug,
    shortDescription: row.short_description, description: row.description,
    price: Number(row.price), creditPrice: Number(row.credit_price),
    image: row.image, category: category.slug, brand: row.brand,
    keywords: row.keywords, variations: row.variations ?? undefined,
    featured: row.featured, bestSeller: row.best_seller, giftSection: row.gift_section,
    available: row.available, active: row.active, createdAt: row.created_at,
  };
}

export function mapProduct(row: ProductRow): AdminProduct {
  return { ...row, price: Number(row.price).toFixed(2), credit_price: Number(row.credit_price).toFixed(2) };
}
