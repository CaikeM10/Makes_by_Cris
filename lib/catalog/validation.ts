import type { CatalogFilters, ProductPatch } from "./repository";

export const productFields = {
  name: { label: "Nome do produto", max: 200 },
  brand: { label: "Marca", max: 120 },
  short_description: { label: "Descrição curta", max: 500 },
  description: { label: "Descrição completa", max: 10000 },
} as const;
export const publicationFields = { active: "Ativo", available: "Disponível", featured: "Destaques", best_seller: "Mais vendidos", gift_section: "Presentes & Kits" } as const;
export function parseMoney(value: unknown): string | null {
  if (typeof value !== "string" || !/^\d{1,10}([.,]\d{1,2})?$/.test(value.trim())) return null;
  return Number(value.trim().replace(",", ".")).toFixed(2);
}
export function validateProduct(input: Record<string, unknown>): { data?: ProductPatch; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const data: Record<string, unknown> = {};
  for (const [key, spec] of Object.entries(productFields)) {
    const value = typeof input[key] === "string" ? input[key].trim() : "";
    if (!value || value.length > spec.max) errors[key] = `${spec.label}: informe de 1 a ${spec.max} caracteres.`;
    data[key] = value;
  }
  for (const key of ["price", "credit_price"]) {
    data[key] = parseMoney(input[key]);
    if (data[key] === null) errors[key] = "Informe um preço válido, sem separador de milhar, com até duas casas decimais.";
  }
  if (typeof input.category_id !== "string" || !input.category_id.trim() || input.category_id.length > 100) errors.category_id = "Selecione uma categoria.";
  data.category_id = input.category_id;
  for (const key of Object.keys(publicationFields)) {
    if (typeof input[key] !== "boolean") errors[key] = "Informe uma opção válida.";
    data[key] = input[key];
  }
  return { data: Object.keys(errors).length ? undefined : data as ProductPatch, errors };
}
export function parseFilters(params: Record<string, string | string[] | undefined>): CatalogFilters {
  const str = (key: string) => typeof params[key] === "string" ? params[key] as string : "";
  return { q: str("q").trim().slice(0, 120), filter: ["active", "inactive", "featured", "best_seller"].includes(str("filter")) ? str("filter") : "all", category: str("category").slice(0, 100), page: Math.min(100000, Math.max(1, Number.parseInt(str("page"), 10) || 1)) };
}
