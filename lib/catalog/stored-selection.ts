import type { CartItem, Product } from "@/lib/types";

export type StoredLine = { productId: string; quantity: number; variation?: string };
export function parseStoredBag(raw: string | null): StoredLine[] {
  try {
    const value: unknown = JSON.parse(raw ?? "[]");
    if (!Array.isArray(value)) return [];
    return value.flatMap(line => {
      if (!line || typeof line.productId !== "string" || !Number.isInteger(line.quantity) || line.quantity < 1) return [];
      return [{ productId: line.productId, quantity: Math.min(line.quantity, 99), variation: typeof line.variation === "string" ? line.variation : undefined }];
    });
  } catch { return []; }
}
export function parseStoredFavorites(raw: string | null): string[] {
  try {
    const value: unknown = JSON.parse(raw ?? "[]");
    return Array.isArray(value) ? [...new Set(value.filter((id): id is string => typeof id === "string"))] : [];
  } catch { return []; }
}
export function resolveStoredBag(lines: StoredLine[], products: Product[]): CartItem[] {
  const byId = new Map(products.filter(p => p.active).map(p => [p.id, p]));
  return lines.flatMap(line => {
    const product = byId.get(line.productId);
    return product ? [{ product, quantity: line.quantity, variation: line.variation }] : [];
  });
}
