import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Campaign, CampaignBanner, CampaignWithProducts } from "./model";
import { CAMPAIGN_BUCKET, eligibleCampaignProduct, isCampaignImagePath } from "./model";
import { readPublicCatalog } from "@/lib/catalog/public-repository";

export async function campaignImages(client: SupabaseClient, campaign: Campaign): Promise<CampaignBanner> {
  const paths = [campaign.desktop_image_path, campaign.mobile_image_path].filter(isCampaignImagePath);
  if (!paths.length) return { ...campaign, desktopUrl: '', mobileUrl: '' };
  const { data, error } = await client.storage.from(CAMPAIGN_BUCKET).createSignedUrls(paths, 300);
  if (error) throw new Error('campaign-images');
  const url = (path: string) => data?.find(row => row.path === path)?.signedUrl || '';
  return { ...campaign, desktopUrl: url(campaign.desktop_image_path), mobileUrl: url(campaign.mobile_image_path) };
}
export async function listCampaigns(client: SupabaseClient): Promise<CampaignWithProducts[]> {
  const { data, error } = await client.from('campaigns').select('*,campaign_products(product_id,position)').order('created_at', { ascending: false });
  if (error) throw new Error('campaign-read');
  return (data ?? []).map(row => ({ ...row, productIds: [...row.campaign_products].sort((a, b) => a.position - b.position).map(p => p.product_id) }));
}
export async function getCampaign(client: SupabaseClient, id: string): Promise<CampaignWithProducts | null> {
  const { data, error } = await client.from('campaigns').select('*,campaign_products(product_id,position)').eq('id', id).maybeSingle();
  if (error) throw new Error('campaign-read');
  return data ? { ...data, productIds: [...data.campaign_products].sort((a, b) => a.position - b.position).map(p => p.product_id) } : null;
}
export async function campaignProductOptions(client: SupabaseClient) {
  const catalog = await readPublicCatalog(client);
  return { categories: catalog.categories, products: catalog.products.filter(eligibleCampaignProduct) };
}

export async function readPublicCampaign(client: SupabaseClient, slug?: string) {
  let query = client.from('campaigns').select('*,campaign_products(product_id,position)').eq('active', true);
  if (slug) query = query.eq('slug', slug);
  const { data, error } = await query.maybeSingle();
  // During rollout the default Hero remains usable before the additive migration.
  if (error?.code === 'PGRST205' || error?.code === '42P01') return null;
  if (error) throw new Error('campaign-read');
  if (!data || !data.active) return null;
  const options = await campaignProductOptions(client);
  const ids = [...data.campaign_products].sort((a, b) => a.position - b.position).map(p => p.product_id);
  const products = ids.flatMap(id => options.products.filter(p => p.id === id));
  if (!products.length) return null;
  const campaign = await campaignImages(client, data);
  if (!campaign.desktopUrl) return null;
  return { campaign, products };
}
