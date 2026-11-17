import 'server-only';
import type { Metadata } from 'next';
import type { Product } from '@/lib/types';
import { getSiteUrl } from '@/lib/admin/site-url';
import { storeConfig } from '@/lib/store-config';

export function canonicalUrl(path: string) {
  const origin = getSiteUrl();
  return origin ? new URL(path, origin).href : undefined;
}

export function pageMetadata(title: string, description: string | null | undefined, path: string, image?: string): Metadata {
  const url = canonicalUrl(path);
  const fullTitle = title === storeConfig.name ? title : `${title} | ${storeConfig.name}`;
  return {
    title, description: description || undefined,
    alternates: url ? { canonical: url } : undefined,
    openGraph: { title: fullTitle, description: description || undefined, url, type: 'website', locale: 'pt_BR', siteName: storeConfig.name, ...(image ? { images: [{ url: image, alt: title }] } : {}) },
    twitter: { card: image ? 'summary_large_image' : 'summary', title: fullTitle, description: description || undefined, ...(image ? { images: [image] } : {}) },
  };
}

export function productJsonLd(product: Product) {
  const url = canonicalUrl(`/produto/${encodeURIComponent(product.slug)}`);
  if (!url) return null;
  return {
    '@context': 'https://schema.org', '@type': 'Product', name: product.name,
    ...(product.image ? { image: new URL(product.image, url).href } : {}),
    ...(product.shortDescription || product.description ? { description: product.shortDescription || product.description } : {}),
    ...(product.brand ? { brand: { '@type': 'Brand', name: product.brand } } : {}),
    url, offers: { '@type': 'Offer', url, price: product.price, priceCurrency: 'BRL', availability: `https://schema.org/${product.available ? 'InStock' : 'OutOfStock'}` },
  };
}

export function serializeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}
