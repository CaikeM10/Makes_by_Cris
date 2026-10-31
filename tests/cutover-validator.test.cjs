const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { RECENT_NAMES, validateImages } = require('../lib/catalog/cutover-validator.cjs');
function fixture(provisional = 36) {
  const bytes = Buffer.from('RIFF0000WEBPtest');
  const manifest = Array.from({ length: 69 }, (_, i) => ({ id: 'id-' + i,
    name: RECENT_NAMES[i] || 'Product ' + i,
    imageSource: i < Math.max(8, provisional) ? 'generated-provisional' : 'local-human-reviewed' }));
  const rows = manifest.map(m => ({ ...m, image: `products/${m.id}/image.webp` }));
  const audit = rows.map((p, i) => ({ ...p, storagePath: p.image,
    image_url: 'https://example.com/' + p.image,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    originClassification: i < provisional ? 'generated-provisional' : 'unknown-origin' }));
  return { rows, manifest, audit,
    image: { isProductImagePath: p => /^products\/.+\/image.webp$/.test(p), resolveProductImage: p => 'https://example.com/' + p },
    fetchImage: async () => new Response(bytes, { status: 200, headers: { 'content-type': 'image/webp' } }) };
}
for (const count of [8, 36, 17, 69]) test(`${count} provisional images are valid`, async () => {
  const result = await validateImages(fixture(count));
  assert.equal(result.generatedProvisionalTotal, count);
  assert.equal(result.resolved, 69);
});
test('eight recent products are identified individually', async () => {
  const result = await validateImages(fixture());
  assert.deepEqual(result.recent.map(p => p.name), RECENT_NAMES);
});
test('missing recent product fails', async () => {
  const f = fixture(); f.rows[0].id = 'wrong';
  await assert.rejects(validateImages(f), /Recent UUID/);
});
for (const index of [0, 40]) test(`missing image path at ${index} fails`, async () => {
  const f = fixture(); delete f.rows[index].image;
  await assert.rejects(validateImages(f), /image path/);
});
test('HTTP failure blocks publication', async () => {
  const f = fixture(); f.fetchImage = async () => new Response('missing', { status: 404 });
  await assert.rejects(validateImages(f), /Image HTTP/);
});
test('unknown-origin and provisional images do not block publication', async () => {
  const result = await validateImages(fixture());
  assert.equal(result.unknownOrigin, 33); assert.equal(result.broken, 0);
});
test('empty image blocks publication', async () => {
  const f = fixture(); f.fetchImage = async () => new Response('', { status: 200 });
  await assert.rejects(validateImages(f), /Empty image/);
});
test('wrong product to image association fails', async () => {
  const f = fixture(); f.rows[0].image = f.rows[1].image;
  await assert.rejects(validateImages(f), /Image owner/);
});
test('wrong image content fails despite HTTP 200', async () => {
  const f = fixture(); f.audit[0].sha256 = 'wrong';
  await assert.rejects(validateImages(f), /content association/);
});
