import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { homeImageOrigin } from "./home-catalog";

type SummaryProduct = { id: string; name: string; image: string; active: boolean; available: boolean; category_id: string };
type SummaryCategory = { id: string; active: boolean };

export function summarizeAdminCatalog(products: SummaryProduct[], categories: SummaryCategory[]) {
  const publicCategories = new Set(categories.filter(c => c.active).map(c => c.id));
  const populated = new Set(products.filter(p => p.active && p.available && publicCategories.has(p.category_id)).map(p => p.category_id));
  // Exact-path audit evidence is shared with the public presentation. Replacing
  // an image in Admin changes its path, so it cannot inherit an old classification.
  const provisionalProducts = products.filter(p => homeImageOrigin(p.image) === "generated-provisional")
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR") || a.id.localeCompare(b.id));
  return {
    totalProducts: products.length,
    activeProducts: products.filter(p => p.active).length,
    populatedCategories: populated.size,
    provisionalImages: provisionalProducts.length,
    reviewProducts: provisionalProducts.slice(0, 3).map(p => ({ id: p.id, name: p.name })),
  };
}

export async function readAdminCatalogSummary(client: SupabaseClient) {
  const products: SummaryProduct[] = [];
  const readProducts = async () => {
    // Range pagination prevents a summary from silently counting only one page.
    const batch = 500;
    for (let offset = 0; ; offset += batch) {
      const { data, error } = await client.from("products")
        .select("id,name,image,active,available,category_id").order("id").range(offset, offset + batch - 1);
      if (error) throw new Error("catalog-read");
      products.push(...(data ?? []));
      if (!data || data.length < batch) return;
    }
  };
  const readCategories = async () => {
    const { data, error } = await client.from("categories").select("id,active").order("id");
    if (error) throw new Error("catalog-read");
    return data ?? [];
  };
  const [, categories] = await Promise.all([readProducts(), readCategories()]);
  return summarizeAdminCatalog(products, categories);
}
