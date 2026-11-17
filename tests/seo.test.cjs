const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./helpers/load-typescript.cjs');
const env = { NEXT_PUBLIC_SITE_URL: 'https://makes.example', NODE_ENV: 'production' };
const seo = load('lib/seo.ts', {}, env);

test('SEO: real product metadata has canonical, explicit OG and Twitter, no invented description', () => {
  const metadata = seo.pageMetadata('Produto real', null, '/produto/real', '/images/real.png');
  assert.equal(metadata.alternates.canonical, 'https://makes.example/produto/real');
  assert.equal(metadata.openGraph.title, 'Produto real | Makes by Cris Martins');
  assert.equal(metadata.openGraph.images[0].url, '/images/real.png');
  assert.equal(metadata.twitter.card, 'summary_large_image');
  assert.equal(metadata.description, undefined);
});

test('SEO: Product uses actual price and availability, omits unknown fields, escapes script injection', () => {
  const product = { name: '</script><script>alert(1)</script>', slug: 'real', image: '/images/real.png', price: 29.9, available: false, brand: null };
  const data = seo.productJsonLd(product);
  assert.equal(data.offers.price, 29.9);
  assert.equal(data.offers.priceCurrency, 'BRL');
  assert.equal(data.offers.availability, 'https://schema.org/OutOfStock');
  for (const key of ['brand', 'review', 'aggregateRating', 'sku', 'gtin', 'description']) assert.equal(data[key], undefined);
  assert.doesNotMatch(seo.serializeJsonLd(data), /<\/script>/);
  assert.equal(JSON.parse(seo.serializeJsonLd(data)).name, product.name);
});

test('SEO: no fabricated domain when canonical environment is unavailable', () => {
  const local = load('lib/seo.ts');
  assert.equal(local.canonicalUrl('/'), undefined);
  assert.equal(local.productJsonLd({ slug: 'real' }), null);
});

test('SEO: sitemap includes actual indexable routes and omits private and utility pages', async () => {
  const sitemap = load('app/sitemap.ts', {
    '@/lib/catalog/home-server': { getHomeCatalog: async () => ({ categories: [{ slug: 'categoria-real' }] }) },
    '@/lib/catalog/public-server': { getPublicCatalog: async () => ({ products: [{ slug: 'ativo-esgotado' }, { slug: 'ativo' }] }) },
    '@/lib/campaigns/public-server': { getPublicCampaign: async () => ({ campaign: { slug: 'campanha-real' } }) },
  }, env).default;
  const urls = (await sitemap()).map(row => row.url);
  assert.ok(urls.includes('https://makes.example/produto/ativo-esgotado'));
  assert.ok(urls.includes('https://makes.example/campanha/campanha-real'));
  assert.ok(urls.includes('https://makes.example/categoria/categoria-real'));
  assert.ok(urls.every(url => !/admin|checkout|sacola|api\/|favoritos/.test(url)));
});

test('SEO: robots preserves public rendering, disallows internal routes and advertises sitemap', () => {
  const rules = load('app/robots.ts', {}, env).default();
  assert.equal(rules.rules.allow, '/');
  assert.ok(rules.rules.disallow.includes('/admin'));
  assert.ok(!rules.rules.disallow.includes('/_next/'));
  assert.equal(rules.sitemap, 'https://makes.example/sitemap.xml');
  for (const route of ['checkout', 'sacola', 'favoritos', 'conta', 'pedido-enviado']) assert.equal(load(`app/(loja)/${route}/layout.tsx`).metadata.robots.index, false);
  assert.equal(load('app/admin/layout.tsx', { './admin.css': {} }).metadata.robots.index, false);
});
