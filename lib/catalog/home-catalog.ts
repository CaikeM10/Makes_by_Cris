import type { Category } from "@/lib/types";
import type { PublicCatalog } from "./public-catalog";
import type { PublicProduct } from "./mappers";
import { normalizeText } from "@/lib/format";
import { resolveProductImage } from "./product-image";
import imageOrigins from "./home-image-origins.json";
import { getAvailablePublicProducts, getPublicCategoryCounts } from "./public-products";

const SECTION_SIZE = 4;
const originRanks: Record<string, number> = {
  "confirmed-existing": 0, "unknown-origin": 1, "generated-provisional": 2,
};
const origins: Record<string, string> = imageOrigins;
const legacyCategoryArtwork = new Set([
  "/images/categorias/maquiagem.png", "/images/categorias/perfumes.png",
  "/images/categorias/cabelos.png", "/images/categorias/skincare.png",
  "/images/categorias/corpo-e-banho.png", "/images/categorias/acessorios.png",
]);

// Evidence is keyed by the exact image path, not product ID: an Admin replacement
// must not inherit the previous image's provenance. Unclassified uploads stay unknown.
export function homeImageOrigin(image: string) {
  const path = image.split("/storage/v1/object/public/product-images/").pop() || image;
  return origins[path] || "unknown-origin";
}

function compareProducts(a: PublicProduct, b: PublicProduct) {
  return (originRanks[homeImageOrigin(a.image)] ?? 1) - (originRanks[homeImageOrigin(b.image)] ?? 1)
    || a.name.localeCompare(b.name, "pt-BR") || a.id.localeCompare(b.id);
}

export function getPublicCategoriesWithProducts(catalog: PublicCatalog) {
  const populated = new Set(getAvailablePublicProducts(catalog).map(p => p.category));
  return catalog.categories.filter(c => c.active && populated.has(c.slug));
}

// Round-robin categories, preserving explicit Admin priorities. No random ranking
// and no sales claims: these are editorial selections when flags are not configured.
function diverseSelection(pool: PublicProduct[], excluded: Set<string>, priority: (p: PublicProduct) => boolean) {
  const ordered = [...pool].sort((a, b) => Number(priority(b)) - Number(priority(a)) || compareProducts(a, b));
  const chosen: PublicProduct[] = [];
  const seen = new Set<string>();
  for (const allowRepeatCategory of [false, true]) {
    for (const p of ordered) {
      if (chosen.length === SECTION_SIZE) break;
      if (excluded.has(p.id) || chosen.some(c => c.id === p.id) || (!allowRepeatCategory && seen.has(p.category))) continue;
      chosen.push(p); seen.add(p.category);
    }
  }
  return chosen;
}

export function selectHomeCatalog(catalog: PublicCatalog, validCategoryImages: ReadonlySet<string> = new Set()) {
  const products = getAvailablePublicProducts(catalog);
  const categories = getPublicCategoriesWithProducts(catalog);
  const counts = getPublicCategoryCounts(products, categories);
  const categoryCards = categories.map(category => {
    const candidates = products.filter(p => p.category === category.slug && p.image).sort(compareProducts);
    const own = resolveProductImage(category.image || "");
    // Home and /categorias share this order. Legacy illustrations must never
    // outrank an actual product image, even when that image is provisional.
    // Other verified own category images come first.
    const legacyArtwork = legacyCategoryArtwork.has(own);
    const ownValid = validCategoryImages.has(own);
    const images = [
      ...(ownValid && !legacyArtwork ? [own] : []),
      ...candidates.filter(p => homeImageOrigin(p.image) !== "generated-provisional").map(p => resolveProductImage(p.image)),
      ...candidates.filter(p => homeImageOrigin(p.image) === "generated-provisional").map(p => resolveProductImage(p.image)),
      ...(ownValid && legacyArtwork ? [own] : []),
      "/placeholder.svg",
    ];
    return { ...category, image: images[0], imageFallbacks: [...new Set(images)].slice(1) };
  });

  // Reserve newest products first so the working Novidades section is preserved.
  const latest = [...products].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id)).slice(0, SECTION_SIZE);
  const used = new Set(latest.map(p => p.id));
  const giftSlugs = new Set(categories.filter(c => /\bpresentes?\b/.test(normalizeText(c.name))).map(c => c.slug));
  const giftPool = products.filter(p => giftSlugs.has(p.category) || p.giftSection);
  const gifts = diverseSelection(giftPool, used, p => p.giftSection);
  gifts.forEach(p => used.add(p.id));
  const highlights = diverseSelection(products, used, p => p.featured);
  highlights.forEach(p => used.add(p.id));
  const preferred = diverseSelection(products, used, p => p.bestSeller);
  // Small catalogs may reuse products between sections; never resurrect mocks.
  const fill = (selected: PublicProduct[], pool: PublicProduct[], priority: (p: PublicProduct) => boolean) =>
    selected.length === SECTION_SIZE ? selected : [...selected, ...diverseSelection(pool, new Set(selected.map(p => p.id)), priority)].slice(0, SECTION_SIZE);
  return { products, categories: categoryCards, counts, latest,
    getCategoryBySlug: (slug: string) => categoryCards.find(c => c.slug === slug),
    getProductsByCategory: (slug: string) => products.filter(p => p.category === slug),
    highlights: fill(highlights, products, p => p.featured),
    preferred: fill(preferred, products, p => p.bestSeller),
    gifts: fill(gifts, giftPool, p => p.giftSection) };
}

export type HomeCategory = Category & { imageFallbacks?: string[] };
