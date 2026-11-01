const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const React = require('react');
const { renderToStaticMarkup: render } = require('react-dom/server');
const { load } = require('./helpers/load-typescript.cjs');
const { summarizeAdminCatalog, readAdminCatalogSummary } = load('lib/catalog/admin-summary.ts');
const fixture = require('./fixtures/home-public-catalog.json');
const products = fixture.products.map(p => ({ ...p, category_id: fixture.categories.find(c => c.slug === p.category).id }));
const summary = summarizeAdminCatalog(products, fixture.categories);
const link = { __esModule: true, default: ({ children, ...props }) => React.createElement('a', props, children) };
const mocks = {
  'next/link': link,
  '@/lib/admin/auth': { requireAdmin: async () => ({ supabase: 'authorized-client' }) },
  '@/lib/catalog/admin-summary': { readAdminCatalogSummary: async client => { assert.equal(client, 'authorized-client'); return summary; } },
  '@/lib/admin/site-url': { getSiteUrl: () => 'https://makes.example' },
};

test('Admin Home has explicit CTAs, existing destinations and a discreet public catalog link', async () => {
  const html = render(await load('app/admin/(protected)/page.tsx', mocks).default());
  assert.match(html, /class="admin-button" href="\/admin\/produtos">Gerenciar produtos<\/a>/);
  assert.match(html, /href="\/admin\/produtos\/novo">Adicionar produto<\/a>/);
  assert.match(html, /Gerencie produtos, preços, imagens e disponibilidade do catálogo\./);
  assert.match(html, /class="admin-catalog-link" href="https:\/\/makes.example"/);
  for (const value of Object.values(summary).filter(v => typeof v === 'number')) assert.ok(html.includes(`<dd>${value}</dd>`));
});

test('summary counts actual supplied records, including archived products, without commercial constants', () => {
  const archived = { ...products[0], id: 'archived', image: '/old.webp', active: false, available: false };
  const result = summarizeAdminCatalog([...products, archived], fixture.categories);
  assert.equal(result.totalProducts, products.length + 1);
  assert.equal(result.activeProducts, products.filter(p => p.active).length);
  assert.equal(result.populatedCategories, new Set(products.filter(p => p.active && p.available).map(p => p.category_id)).size);
  const evidence = require('../lib/catalog/home-image-origins.json');
  assert.equal(result.provisionalImages, products.filter(p => evidence[p.image.split('/storage/v1/object/public/product-images/').pop()] === 'generated-provisional').length);
  assert.equal(summarizeAdminCatalog([], []).totalProducts, 0);
  const source = fs.readFileSync('app/admin/(protected)/page.tsx', 'utf8');
  assert.doesNotMatch(source, /\b(69|36|93)\b/);
});

test('public category count excludes inactive/unavailable products and inactive categories', () => {
  const rows = [
    { ...products[0], category_id: 'yes' }, { ...products[0], category_id: 'inactive', active: false },
    { ...products[0], category_id: 'sold-out', available: false }, { ...products[0], category_id: 'hidden' },
  ];
  const cats = ['yes', 'inactive', 'sold-out', 'hidden'].map(id => ({ id, active: id !== 'hidden' }));
  assert.equal(summarizeAdminCatalog(rows, cats).populatedCategories, 1);
});

test('provisional review evidence belongs to the exact current image path', () => {
  const p = products.find(p => p.image.includes(Object.keys(require('../lib/catalog/home-image-origins.json')).find(key => require('../lib/catalog/home-image-origins.json')[key] === 'generated-provisional')));
  assert.equal(summarizeAdminCatalog([p], fixture.categories).provisionalImages, 1);
  assert.equal(summarizeAdminCatalog([{ ...p, image: `products/${p.id}/replacement.webp` }], fixture.categories).provisionalImages, 0);
  assert.ok(summary.reviewProducts.length <= 3);
});

function mockClient(rows, categories, fail = false) {
  const calls = [];
  return { calls, from(table) {
    calls.push(table);
    const result = table === 'products' ? rows : categories;
    const query = {
      select(columns) { assert.ok(!columns.includes('*')); return this; }, order() { return this; },
      range: async (from, to) => ({ data: result.slice(from, to + 1), error: fail ? Error('private-db-error') : null }),
      then: (resolve, reject) => Promise.resolve({ data: result, error: fail ? Error('private-db-error') : null }).then(resolve, reject),
    };
    return query;
  } };
}
test('summary repository paginates reads and uses only selected administrative data', async () => {
  const rows = Array.from({ length: 1003 }, (_, i) => ({ ...products[0], id: String(i) }));
  const client = mockClient(rows, fixture.categories);
  const result = await readAdminCatalogSummary(client);
  assert.equal(result.totalProducts, rows.length);
  assert.equal(client.calls.filter(t => t === 'products').length, 3);
});
test('summary read errors are surfaced, not replaced with invented counts', async () => {
  await assert.rejects(readAdminCatalogSummary(mockClient([], [], true)), /catalog-read/);
  const html = render(await load('app/admin/(protected)/page.tsx', { ...mocks,
    '@/lib/catalog/admin-summary': { readAdminCatalogSummary: async () => { throw Error('private-db-error'); } },
  }).default());
  assert.match(html, /Não foi possível carregar o resumo/);
  assert.match(html, /Gerenciar produtos/); assert.doesNotMatch(html, /<dd>|private-db-error/);
});

test('authentication precedes summary access, rejecting unauthenticated visits', async () => {
  const Page = load('app/admin/(protected)/page.tsx', { ...mocks,
    '@/lib/admin/auth': { requireAdmin: async () => { throw Error('/admin/login'); } },
    '@/lib/catalog/admin-summary': { readAdminCatalogSummary: () => assert.fail('Must authenticate first') },
  }).default;
  await assert.rejects(Page(), /\/admin\/login/);
});

test('sidebar navigation keeps destinations and correct active state, including editing a product', () => {
  for (const pathname of ['/admin', '/admin/produtos', '/admin/produtos/new/editar']) {
    const { AdminNavigation } = load('components/admin/admin-navigation.tsx', { 'next/link': link, 'next/navigation': { usePathname: () => pathname } });
    const html = render(React.createElement(AdminNavigation));
    assert.ok(html.includes('href="/admin"') && html.includes('href="/admin/produtos"'));
    assert.equal((html.match(/aria-current="page"/g) || []).length, 1);
    const expected = pathname === '/admin' ? '/admin' : '/admin/produtos';
    assert.ok(html.includes(`href="${expected}" aria-current="page"`));
  }
});

test('logout keeps action wiring, accessible labels, pending state and errors', () => {
  const logout = () => {};
  for (const pending of [false, true]) {
    const { LogoutButton } = load('components/admin/logout-button.tsx', {
      '@/app/admin/actions': { logout }, react: { ...React, useActionState: action => { assert.equal(action, logout); return [{}, () => {}, pending]; } },
    });
    const html = render(React.createElement(LogoutButton));
    assert.ok(html.includes(pending ? 'Saindo…' : 'Sair'));
    assert.equal(html.includes('disabled=""'), pending);
  }
});

test('CSS fixes the offending selector at its source and defines visible CTA states', () => {
  const css = fs.readFileSync('app/admin/admin.css', 'utf8');
  assert.doesNotMatch(css, /\.admin-home-note\s+a\s*\{/);
  assert.match(css, /\.admin-home-note \.admin-catalog-link\s*\{/);
  assert.match(css, /\.admin-button\s*\{[^}]*color: #fff;/);
  assert.match(css, /\.admin-button:hover:not\(:disabled\)/);
  assert.match(css, /\.admin-button:active:not\(:disabled\)/);
  assert.match(css, /\.admin-root \.admin-button:disabled\s*\{[^}]*opacity: 1/);
  assert.match(css, /focus-visible\s*\{[^}]*outline: 3px solid/);
});
