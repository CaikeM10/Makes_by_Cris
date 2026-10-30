const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const moduleImage = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/catalog/product-image.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { module: moduleImage, exports: moduleImage.exports, process: { env: {} } });
const { isProductImagePath, resolveProductImage } = moduleImage.exports;
const uuid = '12345678-1234-4234-8234-123456789abc';
const hash = 'abcdef0123456789'.repeat(4);
const base = 'https://example.supabase.co';
for (const [kind, filename] of [['UUID', uuid], ['SHA-256', hash]]) {
  for (const ext of ['webp', 'png', 'jpg']) test(`${kind} ${ext} resolves to the exact managed object`, () => {
    const path = `products/${uuid}/${filename}.${ext}`;
    assert.equal(isProductImagePath(path), true);
    assert.equal(resolveProductImage(path, base + '/'), `${base}/storage/v1/object/public/product-images/${path}`);
    assert.equal(resolveProductImage(path, ''), '/placeholder.svg');
  });
}
const invalid = [ `products/${uuid}/${hash}a.webp`, `products/${hash}.webp`, '', `products/${uuid}/invalid.webp`, `products/${uuid}/${uuid.slice(1)}.webp`, `products/${uuid}/${hash.slice(1)}.webp`, `products/${uuid}/${'g'.repeat(64)}.webp`, `products/${uuid}/${hash}.svg`, `products/${uuid}/${hash}.jpeg`, `other/${uuid}/${hash}.webp`, `products/../${hash}.webp`, `products/..\\/${hash}.webp`, `products/${uuid}/../${hash}.webp`, `products/${uuid}/%2e%2e.webp`, `products/${uuid}//${hash}.webp`, `/products/${uuid}/${hash}.webp`, `products/${uuid}/.webp`, `products/${uuid}/${hash}.webp?x=1`, `products/${uuid}/${hash}.webp#x`, `${base}/products/${uuid}/${hash}.webp`, `products/${uuid}/${hash}.webp\n` ];
for (const path of invalid) test(`reject unsafe or unsupported Storage path ${JSON.stringify(path)}`, () => assert.equal(isProductImagePath(path), false));

test('all 69 staged catalog paths resolve and belong to their product', () => {
  const paths = require('./fixtures/catalog-image-paths.json');
  assert.equal(paths.length, 69);
  for (const row of paths) {
    assert.ok(row.path.startsWith('products/' + row.id + '/'));
    assert.equal(isProductImagePath(row.path), true, row.id);
    assert.equal(resolveProductImage(row.path, base), base + '/storage/v1/object/public/product-images/' + row.path);
  }
});
