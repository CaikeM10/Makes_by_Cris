import type { Category } from "@/lib/types";
import type { PublicProduct } from "./mappers";
import { normalizeText } from "@/lib/format";

export type PublicCatalog = { products: PublicProduct[]; categories: Category[] };

/** Pure selectors shared by server pages and the hydrated public store. */
export function selectPublicCatalog(snapshot: PublicCatalog) {
  const categories = snapshot.categories.filter(c => c.active);
  const slugs = new Set(categories.map(c => c.slug));
  const products = snapshot.products.filter(p => p.active && slugs.has(p.category));
  const getCategoryBySlug = (slug: string) => categories.find(c => c.slug === slug);
  const getCategoryName = (slug: string) => getCategoryBySlug(slug)?.name ?? slug;
  return {
    products, categories, getCategoryBySlug, getCategoryName,
    getProductBySlug: (slug: string) => products.find(p => p.slug === slug),
    getProductById: (id: string) => products.find(p => p.id === id),
    getProductsByCategory: (slug: string) => products.filter(p => p.category === slug),
    featuredProducts: products.filter(p => p.featured),
    bestSellers: products.filter(p => p.bestSeller),
    giftProducts: products.filter(p => p.giftSection && p.available),
    newArrivals: [...products].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8),
    searchCategories(query: string) {
      const term = normalizeText(query);
      if (!term) return [];
      return categories.filter(c => {
        const haystack = normalizeText(`${c.name} ${c.slug} ${c.description}`.replace(/-/g, " "));
        return term.split(/\s+/).every(word => haystack.includes(word));
      });
    },
    searchProducts(query: string) {
      const term = normalizeText(query);
      if (!term) return [];
      return products.flatMap(product => {
        const fields = {
          name: normalizeText(product.name),
          category: normalizeText(`${getCategoryName(product.category)} ${product.category}`),
          brand: normalizeText(product.brand),
          short: normalizeText(product.shortDescription),
          extra: normalizeText(`${product.description} ${product.keywords.join(" ")}`),
        };
        let score = 0;
        for (const word of term.split(/\s+/)) {
          const weight = fields.name.startsWith(word) ? 120 : fields.name.includes(word) ? 90 : fields.category.includes(word) ? 60 : fields.brand.includes(word) ? 45 : fields.short.includes(word) ? 30 : fields.extra.includes(word) ? 12 : 0;
          if (!weight) return [];
          score += weight;
        }
        return [{ product, score }];
      }).sort((a, b) => b.score - a.score || a.product.name.localeCompare(b.product.name, "pt-BR")).map(entry => entry.product);
    },
  };
}
