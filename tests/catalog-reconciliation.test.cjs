const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { planImport, reconcile } = require('../lib/catalog/reconciliation.cjs');
const { createTransport } = require('../scripts/reconcile-catalog.cjs');
const imageRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'catalog-reconcile-'));
fs.writeFileSync(path.join(imageRoot, 'own.webp'), Buffer.from('RIFF\x04\x00\x00\x00WEBP'));
after(() => fs.rmSync(imageRoot, { recursive: true, force: true }));
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
function fixture(count = 1) {
  const products = Array.from({ length: count }, (_, n) => ({ id: id(n + 1), name: `Product ${n}`, slug: `product-${n}`, category: 'Cabelos', price: 55, creditPrice: 61, imageFile: 'own.webp', aliases: [] }));
  return { manifest: { products }, snapshot: { products: [], categories: [{ id: 'cat-3', name: 'Cabelos' }], storageObjects: {} }, reconciliation: { 'new-insert': products.map(p => ({ uuid: p.id, name: p.name, slug: p.slug })) } };
}
const plan = f => planImport(f.manifest, f.snapshot, f.reconciliation, { imageRoot });
function existing(f, overrides = {}) {
  const p = f.manifest.products[0];
  f.snapshot.products.push({ id: p.id, name: p.name, slug: p.slug, price: p.price, credit_price: p.creditPrice, category_id: 'cat-3', image: 'existing.webp', active: false, available: false, ...overrides });
}
test('manifest sizes are dynamic, including current 69 products', () => {
  for (const size of [1, 69, 73]) assert.equal(plan(fixture(size)).totals.insertsReady, size);
});
test('null credit price is softPending and remains null in INSERT', () => {
  const f = fixture(); f.manifest.products[0].creditPrice = null;
  const row = plan(f).rows[0]; assert.equal(row.operation, 'INSERT'); assert.equal(row.payload.credit_price, null); assert.deepEqual(row.softPending, ['credit-price-pending']);
});
test('UPDATE contains only changed credit_price; existing image requires no local replacement', () => {
  const f = fixture(); existing(f, { credit_price: null }); f.manifest.products[0].imageFile = null;
  const result = plan(f); assert.deepEqual(result.rows[0].changes, { credit_price: { from: null, to: 61 } }); assert.equal(result.rows[0].operation, 'UPDATE'); assert.equal(result.imageUploads.length, 0);
});
test('name UPDATE preserves UUID and slug, and pending redirect is nonblocking', () => {
  const f = fixture(); existing(f); const p = f.manifest.products[0]; p.aliases = [p.name]; p.name = 'Full Product Name';
  f.reconciliation.slugPlans = [{ oldSlug: p.slug, proposedSlug: 'full-product-name', needsSlugChange: true }];
  const result = plan(f); assert.equal(result.rows[0].uuid, p.id); assert.deepEqual(result.rows[0].changes, { name: { from: 'Product 0', to: 'Full Product Name' } }); assert.equal(result.slugDecisionsPending.length, 1);
});
test('INSERT starts inactive and unavailable with reserved UUID and deterministic upload', () => {
  const f = fixture(); const a = plan(f), b = plan(f);
  assert.equal(a.rows[0].payload.id, f.manifest.products[0].id); assert.equal(a.rows[0].payload.active, false); assert.equal(a.rows[0].payload.available, false); assert.deepEqual(a.imageUploads, b.imageUploads);
});
test('missing image blocks only that product', () => {
  const f = fixture(2); f.manifest.products[0].imageFile = null;
  const result = plan(f); assert.equal(result.rows[0].blockedReason, 'image-missing'); assert.equal(result.totals.insertsReady, 1); assert.deepEqual(result.globalHardBlockers, []);
});
test('Natura category pending is isolated; UUID, price and image remain intact', () => {
  const f = fixture(2); Object.assign(f.manifest.products[0], { name: 'Natura Ekos Maracujá', categoryStatus: 'pending', creditPrice: null }); const before = structuredClone(f.manifest);
  const result = plan(f); assert.equal(result.rows[0].blockedReason, 'category-pending'); assert.equal(result.totals.insertsReady, 1); assert.deepEqual(f.manifest, before);
});
test('mocks, Admin1 and unknown remote UUIDs never enter mutation plan', () => {
  const f = fixture(); f.snapshot.products.push({ id: 'p-01', name: 'Mock', slug: 'mock' }, { id: id(99), name: 'Produto Teste Admin1', slug: 'admin-test' }, { id: id(100), name: 'Other', slug: 'other' });
  const result = plan(f); assert.equal(result.rows.length, 1); assert.equal(result.totals.mocks, 1); assert.equal(result.totals.testProduct, 1);
  f.manifest.products.push({ ...f.manifest.products[0], id: 'p-01', name: 'Mock', slug: 'mock' }); f.reconciliation['new-insert'].push({ uuid: 'p-01', slug: 'mock' }); assert.ok(plan(f).rows[1].blockedReasons.includes('protected-record'));
});
test('Admin1 explicitly in manifest/plan is blocked defensively', () => {
  const f = fixture(); f.manifest.products[0].name = 'Produto Teste Admin1'; assert.ok(plan(f).rows[0].blockedReasons.includes('protected-record'));
});
test('both Eico products remain separately purchasable with same prices', () => {
  const f = fixture(2); f.manifest.products[0].name = 'Kits Eico todos ganham a máscara de BRINDE'; f.manifest.products[1].name = 'Kit Eico Cachos Definidos';
  const result = plan(f); assert.equal(result.totals.insertsReady, 2); assert.notEqual(result.rows[0].uuid, result.rows[1].uuid); for (const r of result.rows) { assert.equal(r.payload.price, 55); assert.equal(r.payload.credit_price, 61); }
});
test('identity/slug collisions and products outside explicit plan fail closed', () => {
  const f = fixture(); f.snapshot.products.push({ id: id(88), name: 'Product 0', slug: 'product-0' });
  assert.ok(plan(f).rows[0].blockedReasons.includes('slug-identity-collision'));
  f.reconciliation['new-insert'] = []; assert.ok(plan(f).rows[0].blockedReasons.includes('outside-explicit-plan'));
});
test('UUID collision is a global blocker', () => {
  const f = fixture(2); f.manifest.products[1].id = f.manifest.products[0].id; assert.ok(plan(f).globalHardBlockers.includes('manifest-id-collision'));
});
test('second execution is idempotent: zero updates, inserts, uploads; protected rows unchanged', async () => {
  const f = fixture(2); existing(f, { credit_price: null }); const protectedProduct = { id: 'p-01', name: 'Mock', slug: 'mock', active: true }; f.snapshot.products.push(protectedProduct);
  const calls = { update: 0, insert: 0, upload: 0 };
  const transport = { readSnapshot: async () => structuredClone(f.snapshot), updateIfUnchanged: async (uuid, changes, expected) => { assert.equal(expected.active, false); assert.equal(expected.available, false); Object.assign(f.snapshot.products.find(p => p.id === uuid), changes); calls.update++; }, insertIfAbsent: async payload => { f.snapshot.products.push(structuredClone(payload)); calls.insert++; }, ensureImage: async upload => { f.snapshot.storageObjects[upload.storagePath] = upload.sha256; calls.upload++; } };
  await reconcile({ ...f, transport, dryRun: false, imageRoot }); assert.deepEqual(calls, { update: 1, insert: 1, upload: 1 });
  const second = await reconcile({ ...f, transport, dryRun: false, imageRoot }); assert.equal(second.totals.unchanged, 2); assert.deepEqual(calls, { update: 1, insert: 1, upload: 1 }); assert.deepEqual(f.snapshot.products.find(p => p.id === 'p-01'), protectedProduct);
});
test('existing content-addressed upload is reusable after interrupted INSERT', () => {
  const f = fixture(), first = plan(f); const upload = first.imageUploads[0]; f.snapshot.storageObjects[upload.storagePath] = upload.sha256;
  assert.equal(plan(f).imageUploads[0].status, 'exists'); assert.equal(plan(f).totals.imageUploadsReady, 0);
});
test('dry-run performs SELECT only even with executable transport provided', async () => {
  const f = fixture(); let reads = 0;
  const transport = { readSnapshot: async () => { reads++; return f.snapshot; }, updateIfUnchanged: async () => assert.fail('write'), insertIfAbsent: async () => assert.fail('write'), ensureImage: async () => assert.fail('upload') };
  await reconcile({ ...f, transport, dryRun: true, imageRoot }); assert.equal(reads, 1);
});
test('HTTP dry-run adapter never sends mutation methods and rejects direct writes', async () => {
  const methods = [];
  const transport = createTransport({ NEXT_PUBLIC_SUPABASE_URL: 'https://example.invalid', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'anonymous', SUPABASE_SERVICE_ROLE_KEY: 'server' }, async (url, init) => { methods.push(init.method); return { ok: true, json: async () => url.endsWith('/rest/v1/') ? { definitions: { products: { required: ['name'] } } } : [] }; });
  await transport.readSnapshot(); await assert.rejects(transport.updateIfUnchanged(id(1), {}, {}), /Writes disabled/); assert.ok(methods.every(m => m === 'GET'));
});
