import { selectPublicCatalog } from "./public-catalog";
import { getPublicCategoriesWithProducts, type HomeCategory } from "./home-catalog";
import { getAvailablePublicProducts, getPublicCategoryCounts, isRealCatalogProduct } from "./public-products";
import type { PublicProduct } from "./mappers";
import { normalizeText } from "@/lib/format";

export type SearchCatalogSnapshot = { products: PublicProduct[]; categories: HomeCategory[] };
export const SEARCH_PAGE_SIZE = 6;

/** Accept the server-resolved Home categories verbatim: no client image picker,
 * independent category list or static/mock fallback can drift from /categorias. */
export function selectSearchCatalog(snapshot: SearchCatalogSnapshot) {
  const products = getAvailablePublicProducts(snapshot).filter(isRealCatalogProduct);
  const categories = getPublicCategoriesWithProducts({ ...snapshot, products }) as HomeCategory[];
  const selectors = selectPublicCatalog({ products, categories });
  const counts = getPublicCategoryCounts(products, categories);
  const candidates = new Map<string, { text: string; count: number; brand: boolean }>();
  function add(text: string, brand: boolean) {
    const term = normalizeText(text);
    if (term.length < 3 || text.length > 40) return;
    const current = candidates.get(term);
    candidates.set(term, { text: current?.text || text, count: (current?.count || 0) + 1, brand: brand || !!current?.brand });
  }
  for (const p of [...products].sort((a,b) => a.name.localeCompare(b.name, 'pt-BR'))) {
    if (p.brand?.trim()) add(p.brand.trim(), true);
    const first = p.name.match(/[\p{L}\p{N}]+/u)?.[0];
    if (first) add(first, false);
  }
  const ordered = [...candidates.values()].sort((a,b) => Number(b.brand)-Number(a.brand) || b.count-a.count || a.text.localeCompare(b.text,'pt-BR')).map(c=>c.text);
  // Counts above describe catalog terms, never search analytics/popularity.
  const suggestions: string[] = [];
  for (const text of [...ordered, ...categories.map(c=>c.name)]) {
    const normalized = normalizeText(text);
    if (suggestions.some(t => normalized.startsWith(normalizeText(t))) || !selectors.searchProducts(text).length) continue;
    suggestions.push(text);
    if (suggestions.length === 6) break;
  }
  return { ...selectors, categories, counts, suggestions };
}
