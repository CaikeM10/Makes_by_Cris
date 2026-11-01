import type { PublicCatalog } from "./public-catalog";
import type { Category } from "@/lib/types";
import type { PublicProduct } from "./mappers";

export function getAvailablePublicProducts(catalog: PublicCatalog) {
  const active = new Set(catalog.categories.filter(c => c.active).map(c => c.slug));
  return catalog.products.filter(p => p.active && p.available && active.has(p.category));
}

/** The real catalog and Admin uploads use UUIDs; legacy seed IDs and Admin1
 * remain excluded from public editorial/search options even if reactivated. */
export function isRealCatalogProduct(p: { id: string; name: string }) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(p.id)
    && p.name.trim().toLowerCase() !== "produto teste admin1";
}

export function getPublicCategoryCounts(products: PublicProduct[], categories: Category[]) {
  return Object.fromEntries(categories.map(c => [c.slug, products.filter(p => p.category === c.slug).length]));
}
