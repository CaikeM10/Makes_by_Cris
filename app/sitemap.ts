import type { MetadataRoute } from 'next';
import { canonicalUrl } from '@/lib/seo';
import { getHomeCatalog } from '@/lib/catalog/home-server';
import { getPublicCampaign } from '@/lib/campaigns/public-server';
import { getPublicCatalog } from '@/lib/catalog/public-server';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!canonicalUrl('/')) return [];
  const [catalog, publicCatalog, campaign] = await Promise.all([getHomeCatalog(), getPublicCatalog(), getPublicCampaign()]);
  const paths = ['/', '/categorias', ...catalog.categories.map(c => `/categoria/${encodeURIComponent(c.slug)}`), ...publicCatalog.products.map(p => `/produto/${encodeURIComponent(p.slug)}`)];
  if (campaign) paths.push(`/campanha/${encodeURIComponent(campaign.campaign.slug)}`);
  return [...new Set(paths)].map(path => ({ url: canonicalUrl(path)! }));
}
