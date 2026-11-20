import type { AdminProduct, ProductRow } from "./repository";
import type { Category, Product } from "@/lib/types";
import { resolveProductImage } from "./product-image";

export type PublicProduct = Product & { giftSection: boolean; newArrival: boolean };
export type PublicProductRow = Omit<ProductRow, "updated_at" | "catalog_order">;
const reviewedImages: Record<string, string> = {
  "478b60e0-586e-472d-a435-76079f851e3b": "/images/catalogo/presentes-femininos/kit-egeo-choc.png",
  "8b877369-70d7-436c-a13e-131de69524df": "/images/catalogo/perfumes-femininos/linda-tradicional.png",
  "cbe11a34-df2c-49f7-983b-9a6885808469": "/images/catalogo/perfumes-femininos/essencial-exclusivo.png",
  "702f16ae-10ba-424e-8c39-2764a2ae2273": "/images/catalogo/perfumes-femininos/lily-eau-de-parfum.png",
  "52b4b7c8-bec7-4713-b8fe-ae977d7c45ad": "/images/catalogo/presentes-femininos/kit-floratta-red-passion-nativa-spa.png",
  "05a8c8aa-9b37-4616-a2f1-af326bb48d08": "/images/catalogo/presentes-femininos/kit-floratta-red-embalagem-lata.png",
  "ee6b1e22-1c5d-4640-b34b-74996ba80580": "/images/catalogo/presentes-femininos/kit-ameixa.png",
  "ce098789-bb7e-42db-aae3-9f26742d7736": "/images/catalogo/perfumes-masculinos/zaad-eau-tradicional.png",
  "66c3122a-f2e4-44f3-b874-6efceadbb584": "/images/catalogo/hidratantes-corporais/deleite400ml.png",
};
export function mapPublicProduct(row: PublicProductRow, category: Category): PublicProduct {
  return {
    id: row.id, name: row.name, slug: row.slug,
    shortDescription: row.short_description, description: row.description,
    price: Number(row.price), creditPrice: row.credit_price === null ? null : Number(row.credit_price),
    image: reviewedImages[row.id] ?? resolveProductImage(row.image), category: category.slug, brand: row.brand,
    keywords: row.keywords, variations: row.variations ?? undefined,
    featured: row.featured, bestSeller: row.best_seller, giftSection: row.gift_section, newArrival: row.new_arrival,
    available: row.available, active: row.active, createdAt: row.created_at,
  };
}

export function mapProduct(row: ProductRow): AdminProduct {
  return { ...row, price: Number(row.price).toFixed(2), credit_price: row.credit_price === null ? null : Number(row.credit_price).toFixed(2) };
}
