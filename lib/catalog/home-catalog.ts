import type { Category } from "@/lib/types";
import type { PublicCatalog } from "./public-catalog";
import type { PublicProduct } from "./mappers";
import { normalizeText } from "@/lib/format";
import { resolveProductImage } from "./product-image";
import imageOrigins from "./home-image-origins.json";
import { getAvailablePublicProducts, getPublicCategoryCounts } from "./public-products";
import { storefrontCategory } from "./category-placement";

const SECTION_SIZE = 4;
const originRanks: Record<string, number> = {
  "confirmed-existing": 0, "unknown-origin": 1, "generated-provisional": 2,
};
const origins: Record<string, string> = imageOrigins;
// Official category covers follow each product's current image, including Admin replacements.
const categoryCoverProductIds: Record<string, string> = {
  "hidratantes-corporais": "9b65bb57-ba98-44b3-b310-8675c6a4fb1a",
  "infantil": "92e0c220-924a-4ead-ad9e-66c65d41aedf",
  "perfumes-femininos": "ec9b690c-79b6-4bad-a787-0cccbc1e73f2",
  "perfumes-masculinos": "227ba16e-4dbc-4362-9592-0aa12c642dec",
  "presentes-femininos": "ad589a22-4bea-4de4-9564-fb9092effed7",
  "presentes-masculinos": "45d6668a-d450-46be-a18d-1d02ddd08777",
  "cabelos": "43d20ee7-d439-4882-8c97-bca8406f4bf5",
  "corpo-e-banho": "df1879db-6c03-4f19-be3c-b75bba255ae7",
};
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
  const populated = new Set(getAvailablePublicProducts(catalog).map(storefrontCategory));
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
    const candidates = products.filter(p => storefrontCategory(p) === category.slug && p.image).sort(compareProducts);
    const own = resolveProductImage(category.image || "");
    // Home and /categorias share this order. Legacy illustrations must never
    // outrank an actual product image, even when that image is provisional.
    // Other verified own category images come first.
    const legacyArtwork = legacyCategoryArtwork.has(own);
    const ownValid = validCategoryImages.has(own);
    const images = [
      ...candidates.filter(p => p.id === categoryCoverProductIds[category.slug]).map(p => resolveProductImage(p.image)),
      ...(ownValid && !legacyArtwork ? [own] : []),
      ...candidates.filter(p => homeImageOrigin(p.image) !== "generated-provisional").map(p => resolveProductImage(p.image)),
      ...candidates.filter(p => homeImageOrigin(p.image) === "generated-provisional").map(p => resolveProductImage(p.image)),
      ...(ownValid && legacyArtwork ? [own] : []),
      "/placeholder.svg",
    ];
    return { ...category, image: images[0], imageFallbacks: [...new Set(images)].slice(1) };
  });

  // Reserve Novidades before other sections: manual picks first, then newest.
  // Date and ID preserve the original fallback and deterministically break ties.
  const latestIds = new Set<string>();
  const latest = [...products].sort((a, b) =>
    Number(b.newArrival === true) - Number(a.newArrival === true)
    || b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id)
  ).filter(product => {
    if (latestIds.has(product.id)) return false;
    latestIds.add(product.id);
    return true;
  }).slice(0, SECTION_SIZE);
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
    getProductsByCategory: (slug: string) => products.filter(p => storefrontCategory(p) === slug),
    highlights: fill(highlights, products, p => p.featured),
    preferred: fill(preferred, products, p => p.bestSeller),
    gifts: fill(gifts, giftPool, p => p.giftSection) };
}

export type HomeCategory = Category & { imageFallbacks?: string[] };
