const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { renderToStaticMarkup: render } = require('react-dom/server');
const { load } = require('./helpers/load-typescript.cjs');
const fixture = require('./fixtures/home-public-catalog.json');
const { selectHomeCatalog, homeImageOrigin } = load('lib/catalog/home-catalog.ts');
const realIds = new Set(fixture.products.map(p => p.id));
const legacy = new Set(fixture.categories.map(c => c.image).filter(Boolean));
const selection = selectHomeCatalog(fixture, legacy);
const mocks = {
  '@/lib/catalog/home-server': { getHomeCatalog: async () => selection },
  '@/components/product-browser': { ProductBrowser: ({ products }) => React.createElement('div', { 'data-products': products.map(p => p.id).join(',') }) },
  'next/link': { __esModule: true, default: ({ children, ...props }) => React.createElement('a', props, children) },
  'next/navigation': { notFound: () => { throw Error('notFound'); } },
};
test('categories route renders only eight populated categories with matching Home counts and URLs', async () => {
  const Page = load('app/(loja)/categorias/page.tsx', mocks).default;
  const html = render(await Page());
  assert.equal((html.match(/href="\/categoria\//g) || []).length, selection.categories.length);
  assert.equal(selection.categories.length, 8);
  assert.equal(Object.values(selection.counts).reduce((sum, n) => sum + n, 0), fixture.products.length);
  assert.equal(fixture.products.length, 69);
  const feminine = selection.categories.find(c => c.name === 'Perfumes Femininos');
  assert.equal(selection.counts[feminine.slug], 28);
  for (const c of selection.categories) {
    assert.ok(html.includes(`href="/categoria/${c.slug}"`));
    assert.ok(html.includes(`src="${c.image}"`));
    assert.ok(html.includes(`${selection.counts[c.slug]} produtos`));
  }
  for (const slug of ['maquiagem', 'perfumes', 'skincare', 'acessorios']) assert.ok(!html.includes(`href="/categoria/${slug}"`));
  assert.ok(!html.includes('0 produtos'));
});
test('every current category image belongs to its own real product, no legacy artwork or placeholder', () => {
  for (const c of selection.categories) {
    const p = fixture.products.find(p => p.category === c.slug && p.image === c.image);
    assert.ok(p && p.active && p.available && realIds.has(p.id), c.name);
    assert.ok(!c.image.includes('/placeholder.svg') && !legacy.has(c.image));
    const pool = fixture.products.filter(p => p.category === c.slug);
    if (pool.some(p => homeImageOrigin(p.image) === 'confirmed-existing')) {
      assert.equal(homeImageOrigin(c.image), 'confirmed-existing');
    }
  }
});
test('Cabelos uses its approved final image before legacy artwork', () => {
  const c = selection.categories.find(c => c.name === 'Cabelos');
  assert.equal(homeImageOrigin(c.image), 'confirmed-existing');
  assert.ok(c.imageFallbacks.includes('/images/categorias/cabelos.png'));
});

test('provisional product image outranks legacy artwork when no confirmed image exists', () => {
  const category = fixture.categories.find(c => c.name === 'Cabelos');
  const provisional = fixture.products.find(p => homeImageOrigin(p.image) === 'generated-provisional');
  assert.ok(provisional, 'current fixture includes a provisional product');
  const isolated = selectHomeCatalog({ categories: [category], products: [{ ...provisional, category: category.slug }] }, legacy);
  assert.equal(isolated.categories[0].image, provisional.image);
  assert.equal(homeImageOrigin(isolated.categories[0].image), 'generated-provisional');
  assert.ok(isolated.categories[0].imageFallbacks.includes('/images/categorias/cabelos.png'));
});
test('categories page consumes the exact shared selection without rebuilding counts or images', async () => {
  const custom = { categories: [{ id: 'new', name: 'Nova Categoria', slug: 'nova', active: true, image: '/verified.webp' }], counts: { nova: 7 } };
  const Page = load('app/(loja)/categorias/page.tsx', { ...mocks,
    '@/lib/catalog/home-server': { getHomeCatalog: async () => custom },
  }).default;
  const html = render(await Page());
  assert.ok(html.includes('href="/categoria/nova"') && html.includes('7 produtos') && html.includes('src="/verified.webp"'));
});
test('empty catalog renders no mock categories or invented counts', async () => {
  const Page = load('app/(loja)/categorias/page.tsx', { ...mocks,
    '@/lib/catalog/home-server': { getHomeCatalog: async () => selectHomeCatalog({ products: [], categories: fixture.categories }) },
  }).default;
  const html = render(await Page());
  assert.ok(!html.includes('href="/categoria/'));
});
for (const c of selection.categories) test(`category link resolves only its public products: ${c.name}`, async () => {
  const module = load('app/(loja)/categoria/[slug]/page.tsx', mocks);
  const props = { params: Promise.resolve({ slug: c.slug }) };
  const html = render(await module.default(props));
  const expected = fixture.products.filter(p => p.category === c.slug && p.active && p.available);
  const capturedIds = html.match(/data-products="([^"]*)"/)[1].split(',');
  assert.equal(capturedIds.length, selection.counts[c.slug]);
  assert.deepEqual(capturedIds.sort(), expected.map(p => p.id).sort());
  assert.ok(html.includes(`src="${c.image}"`));
  assert.equal((await module.generateMetadata(props)).title, c.name);
});
test('empty/legacy category slug is not a populated public destination', async () => {
  const module = load('app/(loja)/categoria/[slug]/page.tsx', mocks);
  await assert.rejects(module.default({ params: Promise.resolve({ slug: 'maquiagem' }) }), /notFound/);
});
test('Continuar comprando keeps its existing /categorias destination', () => {
  const Page = load('app/(loja)/pedido-enviado/page.tsx', { ...mocks,
    '@/components/link-button': { LinkButton: ({ children, href }) => React.createElement('a', { href }, children) },
  }).default;
  assert.match(render(React.createElement(Page)), /href="\/categorias">Continuar comprando<\/a>/);
});
test('inactive and unavailable products cannot enter shared category detail selectors', () => {
  const modified = { ...fixture, products: fixture.products.map((p, i) => i < 2 ? { ...p, active: i !== 0, available: i !== 1 } : p) };
  const view = selectHomeCatalog(modified, legacy);
  const selected = view.categories.flatMap(c => view.getProductsByCategory(c.slug));
  assert.equal(selected.length, fixture.products.length - 2);
  assert.ok(selected.every(p => p.active && p.available));
});
