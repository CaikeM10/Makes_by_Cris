import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CatalogRepository, ProductRow } from "./repository";
import { mapProduct } from "./mappers";

export const PAGE_SIZE = 24;
export function createCatalogRepository(client: SupabaseClient): CatalogRepository {
  return {
    async categories() {
      const { data, error } = await client.from("categories").select("id,name,slug,active").order("position").order("id");
      if (error) throw new Error("catalog-read");
      return data ?? [];
    },
    async list(filters) {
      let query = client.from("products").select("*", { count: "exact" });
      if (filters.filter === "active" || filters.filter === "inactive") query = query.eq("active", filters.filter === "active");
      if (filters.filter === "featured" || filters.filter === "best_seller") query = query.eq(filters.filter, true);
      if (filters.category) query = query.eq("category_id", filters.category);
      if (filters.q) {
        // Strip PostgREST grammar; user input can never introduce another filter.
        const term = filters.q.replace(/[^\p{L}\p{N}\s-]/gu, " ").trim();
        if (term) {
          const { data: cats, error } = await client.from("categories").select("id").ilike("name", `%${term}%`);
          if (error) throw new Error("catalog-read");
          const ids = (cats ?? []).map(c => `"${String(c.id).replace(/["\\]/g, "")}"`);
          query = query.or(`name.ilike.%${term}%,brand.ilike.%${term}%${ids.length ? `,category_id.in.(${ids.join(",")})` : ""}`);
        }
      }
      const start = (filters.page - 1) * PAGE_SIZE;
      const { data, count, error } = await query.order("catalog_order").order("id").range(start, start + PAGE_SIZE - 1);
      if (error) throw new Error("catalog-read");
      return { products: (data as ProductRow[] ?? []).map(mapProduct), count: count ?? 0 };
    },
    async get(id) {
      const { data, error } = await client.from("products").select("*").eq("id", id).maybeSingle();
      if (error) throw new Error("catalog-read");
      return data ? mapProduct(data as ProductRow) : null;
    },
    async update(id, version, patch) {
      const { data, error } = await client.from("products").update(patch).eq("id", id).eq("updated_at", version).select("id");
      if (error) throw new Error("catalog-write");
      return data?.length === 1;
    },
  };
}
