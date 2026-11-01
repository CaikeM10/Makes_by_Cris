'use strict';
// Explicit read-only QA. This is not run by the offline *.test.cjs suite.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { parseEnv } = require('node:util');
const { createHash } = require('node:crypto');
const { createClient } = require('@supabase/supabase-js');
const { load } = require('./helpers/load-typescript.cjs');
const root = path.resolve(__dirname, '..');
const env = parseEnv(fs.readFileSync(path.join(root, '.env.local'), 'utf8'));
const network = { GET: 0, HEAD: 0, writes: 0 };
async function transport(input, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  assert.ok(['GET', 'HEAD'].includes(method), 'Read-only QA'); network[method]++;
  return fetch(input, { ...options, signal: AbortSignal.timeout(30000) });
}
function client(key) {
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: transport } });
}
async function main() {
  const anon = client(env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const service = client(env.SUPABASE_SERVICE_ROLE_KEY);
  const read = () => service.from('products').select('*').order('id');
  const before = await read(); assert.ifError(before.error);
  const { readPublicCatalog } = load('lib/catalog/public-repository.ts', {}, env);
  const { selectHomeCatalog, homeImageOrigin } = load('lib/catalog/home-catalog.ts', {}, env);
  const { isHomeImageAvailable } = load('lib/catalog/home-server.ts', {
    './public-server': { getPublicCatalog: async () => catalog },
  }, env);
  const catalog = await readPublicCatalog(anon);
  assert.equal(catalog.products.length, 69);
  const baseline = JSON.parse(fs.readFileSync(path.join(root, 'catalog-import/post-cutover-snapshot-v2.json'), 'utf8'));
  const realIds = new Set(baseline.realProducts.map(p => p.id));
  assert.ok(catalog.products.every(p => realIds.has(p.id) && p.active && p.available));
  for (const p of baseline.realProducts) assert.deepEqual(before.data.find(row => row.id === p.id), p, 'Real product drift: ' + p.id);
  const sources = [...new Set(catalog.categories.map(c => c.image).filter(Boolean))];
  const valid = new Set();
  for (const src of sources) if (await isHomeImageAvailable(src)) valid.add(src);
  const home = selectHomeCatalog(catalog, valid);
  assert.equal(home.categories.length, 8);
  assert.equal(Object.values(home.counts).reduce((a, b) => a + b, 0), 69);
  const checks = [];
  const audit = JSON.parse(fs.readFileSync(path.join(root, 'catalog-import/image-usage-matrix.json'), 'utf8'));
  for (const p of catalog.products) {
    const response = await transport(p.image);
    const bytes = Buffer.from(await response.arrayBuffer());
    assert.equal(response.status, 200, p.name);
    assert.ok(response.headers.get('content-type')?.startsWith('image/'));
    assert.ok(bytes.length > 0);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), audit.realProducts.find(row => row.id === p.id).sha256);
    checks.push({ id: p.id, name: p.name, status: response.status, bytes: bytes.length, origin: homeImageOrigin(p.image) });
  }
  const categoryImages = [];
  for (const c of home.categories) {
    const product = catalog.products.find(p => p.image === c.image && p.category === c.slug);
    assert.ok(product, 'Every populated category must prefer an existing product image over legacy artwork/placeholder: ' + c.name);
    categoryImages.push({ id: c.id, slug: c.slug, name: c.name, count: home.counts[c.slug], image: c.image, product: product.name, origin: homeImageOrigin(product.image) });
  }
  const sections = Object.fromEntries(['highlights', 'preferred', 'gifts', 'latest'].map(key => {
    assert.equal(home[key].length, 4); assert.ok(home[key].every(p => realIds.has(p.id)));
    return [key, home[key].map(p => ({ id: p.id, name: p.name, origin: homeImageOrigin(p.image), image: p.image }))];
  }));
  const after = await read(); assert.ifError(after.error); assert.deepEqual(after.data, before.data);
  const output = { generatedAt: new Date().toISOString(), publicProducts: catalog.products.length,
    categories: categoryImages, hiddenEmptyCategories: catalog.categories.filter(c => !home.categories.some(h => h.id === c.id)).map(c => c.name),
    sections, images: checks, realProductsIntact: true, allRemoteProductsIntact: true, network,
    mockProductsRendered: 0, brokenImages: 0 };
  fs.writeFileSync(path.join(root, 'catalog-import/home-reconciliation-qa.json'), JSON.stringify(output, null, 2) + '\n');
  console.log(JSON.stringify({ ...output, images: checks.length, sections: Object.fromEntries(Object.entries(sections).map(([k, v]) => [k, v.map(p => p.name)])) }, null, 2));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
