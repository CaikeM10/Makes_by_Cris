const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./helpers/load-typescript.cjs');
const { selectHomeCatalog, homeImageOrigin } = load('lib/catalog/home-catalog.ts');
const fixture = require('./fixtures/home-public-catalog.json');
const base = 'https://example.supabase.co';
const p = { ...fixture.products[0], id: 'test', name: 'Product', category: 'gifts', image: '/product.webp', active: true, available: true };
const c = { id: 'category', slug: 'gifts', name: 'Presentes Femininos', active: true, image: '' };
const select = (products = [p], categories = [c], valid = []) => selectHomeCatalog({ products, categories }, new Set(valid));

test('current public fixture returns eight populated categories, counts totaling 69', () => {
  const home = selectHomeCatalog(fixture);
  assert.equal(home.categories.length, 8);
  assert.equal(Object.values(home.counts).reduce((a, b) => a + b, 0), 69);
  for (const c of home.categories) assert.equal(home.counts[c.slug], fixture.products.filter(p => p.category === c.slug).length);
  assert.ok(!home.categories.some(c => ['maquiagem', 'perfumes', 'skincare', 'acessorios'].includes(c.slug)));
});
test('empty, inactive and unavailable category products are excluded', () => {
  const home = select([{ ...p, active: false }, { ...p, id: 'no-stock', available: false }]);
  assert.equal(home.categories.length, 0); assert.equal(home.products.length, 0);
  assert.equal(select([p], [{ ...c, active: false }]).products.length, 0);
});
test('verified own category image wins; unverified/broken own source is skipped', () => {
  assert.equal(select([p], [{ ...c, image: '/own.webp' }], ['/own.webp']).categories[0].image, '/own.webp');
  assert.equal(select([p], [{ ...c, image: '/missing.webp' }]).categories[0].image, p.image);
});
test('confirmed product image wins over unknown, provisional and legacy artwork', () => {
  const origins = require('../lib/catalog/home-image-origins.json');
  const entries = Object.entries(origins);
  const rows = ['generated-provisional', 'unknown-origin', 'confirmed-existing'].map((origin, i) => ({ ...p, id: 'p' + i,
    image: base + '/storage/v1/object/public/product-images/' + entries.find(([, value]) => value === origin)[0] }));
  const home = select(rows, [{ ...c, image: '/images/categorias/cabelos.png' }], ['/images/categorias/cabelos.png']);
  assert.equal(home.categories[0].image, rows[2].image);
  assert.equal(homeImageOrigin(home.categories[0].image), 'confirmed-existing');
});
test('provisional product is valid when no confirmed image exists', () => {
  const row = fixture.products.find(p => homeImageOrigin(p.image) === 'generated-provisional');
  const home = select([{ ...row, category: c.slug }]);
  assert.equal(home.categories[0].image, row.image);
  assert.ok(home.highlights.some(p => p.id === row.id));
});
test('missing category and product images use the existing visual fallback', () => {
  const home = select([{ ...p, image: '' }], [{ ...c, image: '/broken.webp' }]);
  assert.equal(home.categories[0].image, '/placeholder.svg');
  assert.ok(require('node:fs').existsSync('public/placeholder.svg'));
});
test('four real products per section, no mocks, active/available, deterministic and distributed', () => {
  const home = selectHomeCatalog(fixture);
  const ids = new Set(fixture.products.map(p => p.id));
  const sections = ['highlights', 'preferred', 'gifts', 'latest'];
  const all = sections.flatMap(key => home[key]);
  for (const key of sections) {
    assert.equal(home[key].length, 4);
    assert.ok(home[key].every(p => ids.has(p.id) && p.active && p.available));
  }
  assert.equal(new Set(all.map(p => p.id)).size, 16);
  assert.equal(JSON.stringify(home), JSON.stringify(selectHomeCatalog(fixture)));
});
test('gifts include both actual gift categories without old mock category or flags', () => {
  const home = selectHomeCatalog(fixture);
  const names = home.gifts.map(p => fixture.categories.find(c => c.slug === p.category).name);
  assert.ok(names.includes('Presentes Femininos')); assert.ok(names.includes('Presentes Masculinos'));
  assert.ok(home.gifts.every(p => !p.giftSection));
});
test('newest maintains date ordering and original latest four', () => {
  const home = selectHomeCatalog(fixture);
  const expected = [...fixture.products].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id)).slice(0, 4);
  assert.equal(JSON.stringify(home.latest.map(p => p.id)), JSON.stringify(expected.map(p => p.id)));
});
test('existing admin featured/preferred flags take editorial priority', () => {
  const rows = Array.from({ length: 16 }, (_, i) => ({ ...p, id: 'p-' + i, name: 'Product ' + i,
    createdAt: String(1000 + i), featured: i === 5, bestSeller: i === 6, category: 'care' }));
  const home = select(rows, [{ ...c, slug: 'care', name: 'Cuidados' }]);
  assert.ok(home.highlights.some(p => p.id === 'p-5'));
  assert.ok(home.preferred.some(p => p.id === 'p-6'));
});
test('empty catalog stays empty, no static mock fallback, source input unchanged', () => {
  assert.equal(select([], []).highlights.length, 0);
  const before = JSON.stringify(fixture); selectHomeCatalog(fixture);
  assert.equal(JSON.stringify(fixture), before);
});
test('product image path uses central resolver including SHA-256 provisional files', () => {
  const image = load('lib/catalog/product-image.ts', {}, { NEXT_PUBLIC_SUPABASE_URL: base });
  const homeModule = load('lib/catalog/home-catalog.ts', {}, { NEXT_PUBLIC_SUPABASE_URL: base });
  const row = fixture.products.find(p => homeImageOrigin(p.image) === 'generated-provisional');
  const raw = row.image.split('/storage/v1/object/public/product-images/')[1];
  assert.ok(image.isProductImagePath(raw));
  const home = homeModule.selectHomeCatalog({ products: [{ ...p, image: raw }], categories: [c] });
  assert.equal(home.categories[0].image, image.resolveProductImage(raw));
});
test('SafeImage retries category alternatives and stops with a visual box after every error', () => {
  let state = [];
  const { SafeImage } = load('components/safe-image.tsx', { react: { useState: () => [state, fn => { state = fn(state); }] } });
  const props = { src: '/bad.webp', fallbackSources: ['/good.webp'], alt: 'Category', className: 'aspect-square' };
  let element = SafeImage(props); assert.equal(element.props.src, '/bad.webp');
  element.props.onError(); element = SafeImage(props); assert.equal(element.props.src, '/good.webp');
  element.props.onError(); element = SafeImage(props); assert.equal(element.props.src, '/placeholder.svg');
  element.props.onError(); element = SafeImage(props); assert.equal(element.type, 'span'); assert.equal(element.props.className, 'aspect-square');
  assert.equal(element.props.style.display, 'block');
});

test('footer does not expose empty legacy category links', async () => {
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const { SiteFooter } = load('components/site-footer.tsx', {
    '@/lib/catalog/public-server': { getPublicCatalog: async () => fixture },
    '@/components/brand-logo': { BrandLogo: () => null },
    'next/link': { __esModule: true, default: ({ children, ...props }) => React.createElement('a', props, children) },
  });
  const html = renderToStaticMarkup(await SiteFooter());
  for (const slug of ['maquiagem', 'perfumes', 'skincare', 'acessorios']) assert.ok(!html.includes(`href="/categoria/${slug}"`));
  assert.equal((html.match(/href="\/categoria\//g) || []).length, 8);
});

test('category image availability rejects missing files, empty values and unsafe sources', async () => {
  const { isHomeImageAvailable } = load('lib/catalog/home-server.ts', { './public-server': {} });
  assert.equal(await isHomeImageAvailable('/placeholder.svg'), true);
  for (const source of ['', '/does-not-exist.png', '/../package.json', '//example.com/image.png', 'javascript:alert(1)']) {
    assert.equal(await isHomeImageAvailable(source), false, source);
  }
});

test('unknown image origin is preferred to provisional when no confirmed photo exists', () => {
  const entries = Object.entries(require('../lib/catalog/home-image-origins.json'));
  const rows = ['generated-provisional', 'unknown-origin'].map((origin, i) => ({ ...p, id: 'p-' + i,
    image: base + '/storage/v1/object/public/product-images/' + entries.find(([, value]) => value === origin)[0] }));
  assert.equal(select(rows).categories[0].image, rows[1].image);
});
