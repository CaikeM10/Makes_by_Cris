// Client-reviewed storefront placement. Keep the commercial category intact for
// product details, search, Admin and purchasing. Rules apply only to the old
// placement so a later Admin category correction takes precedence.
const placements: Record<string, { from: string; to: string | null }> = {
  "cbe11a34-df2c-49f7-983b-9a6885808469": { from: "perfumes-masculinos", to: null },
  "d069e56e-7569-438a-bb7a-ca3003288350": { from: "perfumes-masculinos", to: null },
  "ffb425e5-b8eb-4712-98b1-bba3430bfcbd": { from: "perfumes-masculinos", to: null },
  "66c3122a-f2e4-44f3-b874-6efceadbb584": { from: "hidratantes-corporais", to: null },
  "776457e8-aa64-4e4f-8e40-86966679ca33": { from: "perfumes-masculinos", to: "perfumes-femininos" },
  "8d5c4104-85f8-4f8e-a26c-22b0d90d96e7": { from: "perfumes-masculinos", to: "perfumes-femininos" },
};

export function storefrontCategory(product: { id: string; category: string }): string | null {
  const placement = placements[product.id];
  return placement?.from === product.category ? placement.to : product.category;
}
