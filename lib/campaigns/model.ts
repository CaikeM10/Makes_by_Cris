import { isRealCatalogProduct } from "@/lib/catalog/public-products";

export type Campaign = {
  id: string; name: string; slug: string; title: string; description: string; button_text: string;
  desktop_image_path: string; mobile_image_path: string; active: boolean; created_at: string; updated_at: string;
};
export type CampaignWithProducts = Campaign & { productIds: string[] };
export type CampaignBanner = Campaign & { desktopUrl: string; mobileUrl: string };
export type CampaignFormState = { error?: string; errors?: Record<string, string>; warning?: string };
export const CAMPAIGN_BUCKET = "campaign-banners";
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function eligibleCampaignProduct(p: { id: string; name: string; active: boolean; available: boolean }) {
  return p.active && p.available && isRealCatalogProduct(p);
}
export function campaignHref(slug: string) { return `/campanha/${encodeURIComponent(slug)}`; }
export function isCampaignImagePath(value: string) {
  return /^campaigns\/[0-9a-f-]{36}\/(desktop|mobile)\/[0-9a-f-]{36}\.(webp|jpg|png)$(?![\s\S])/.test(value)
    && UUID.test(value.split('/')[1]) && UUID.test(value.split('/')[3]?.split('.')[0]);
}
export function validateCampaign(input: Record<string, unknown>, productIds: string[], active: boolean) {
  const errors: Record<string, string> = {};
  const fields = { name: 200, slug: 150, title: 200, description: 2000, button_text: 80 };
  const data = Object.fromEntries(Object.keys(fields).map(key => [key, typeof input[key] === 'string' ? input[key].trim() : ''])) as Record<keyof typeof fields, string>;
  for (const [key, max] of Object.entries(fields)) {
    if ((key !== 'description' && !data[key as keyof typeof data]) || data[key as keyof typeof data].length > max) errors[key] = 'Confira este campo.';
  }
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(data.slug)) errors.slug = 'Use letras minúsculas, números e hífens.';
  if (productIds.length > 500 || new Set(productIds).size !== productIds.length || productIds.some(id => !UUID.test(id))) errors.products = 'Selecione produtos válidos, sem repetições.';
  if (active && !productIds.length) errors.products = 'Selecione pelo menos um produto disponível antes de ativar.';
  return { data, errors };
}
