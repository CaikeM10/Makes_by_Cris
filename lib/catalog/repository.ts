export type CatalogCategory = { id: string; name: string; slug: string; active: boolean };
export type ProductRow = {
  id: string; name: string; slug: string; short_description: string; description: string;
  price: string | number; credit_price: string | number; image: string; category_id: string;
  brand: string; keywords: string[]; variations: string[] | null;
  featured: boolean; best_seller: boolean; gift_section: boolean; available: boolean; active: boolean;
  catalog_order: number; created_at: string; updated_at: string;
};
export type AdminProduct = Omit<ProductRow, "price" | "credit_price"> & { price: string; credit_price: string };
export type ProductPatch = Pick<AdminProduct, "name" | "brand" | "category_id" | "short_description" | "description" | "price" | "credit_price" | "active" | "available" | "featured" | "best_seller" | "gift_section">;
export type CatalogFilters = { q: string; filter: string; category: string; page: number };
export interface CatalogRepository {
  categories(): Promise<CatalogCategory[]>;
  list(filters: CatalogFilters): Promise<{ products: AdminProduct[]; count: number }>;
  get(id: string): Promise<AdminProduct | null>;
  update(id: string, version: string, patch: ProductPatch): Promise<boolean>;
}
