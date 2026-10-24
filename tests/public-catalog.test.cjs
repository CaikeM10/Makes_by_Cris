const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
function load(file) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, require(name) {
    if (name === 'server-only') return {};
    if (name.startsWith('@/')) return load(name.slice(2) + '.ts');
    if (name.startsWith('./')) return load(path.join(path.dirname(file), name) + '.ts');
    throw Error(name);
  } });
  return module.exports;
}
const { mapPublicProduct } = load('lib/catalog/mappers.ts');
const { selectPublicCatalog } = load('lib/catalog/public-catalog.ts');
const selection = load('lib/catalog/stored-selection.ts');
const category = { id: 'cat-1', name: 'Maquiagem', slug: 'maquiagem', description: 'Beleza', image: '/cat.png', active: true };
const row = { id: 'p-01', name: 'Batom Matte Vermelho Clássico', slug: 'batom-matte-vermelho-classico', short_description: 'Batom', description: 'Descrição', price: '9.90', credit_price: '42.90', image: '/batom.png', category_id: 'cat-1', brand: 'Cris', keywords: ['batom'], variations: ['Vermelho'], featured: true, best_seller: false, gift_section: true, active: true, available: true, created_at: '2026-07-28T00:00:00+00:00', updated_at: 'private-version' };
const product = mapPublicProduct(row, category);
test('mapeamento público preserva IDs, slug, datas, arrays, categoria e preços independentes', () => {
  assert.equal(product.id, 'p-01'); assert.equal(product.slug, row.slug);
  assert.equal(product.price, 9.9); assert.equal(product.creditPrice, 42.9);
  assert.equal(product.category, 'maquiagem'); assert.equal(product.createdAt, row.created_at);
  assert.equal(product.shortDescription, row.short_description);
  assert.equal(product.variations[0], 'Vermelho'); assert.equal(product.giftSection, true);
  assert.equal(product.updated_at, undefined);
  assert.equal(mapPublicProduct({ ...row, variations: null }, category).variations, undefined);
});
test('inativos e categorias inativas não vazam nem para admin na loja', () => {
  const catalog = selectPublicCatalog({ categories: [category, { ...category, slug: 'oculta', active: false }], products: [product, { ...product, id: 'inactive', active: false }, { ...product, id: 'hidden-category', category: 'oculta' }] });
  assert.equal(catalog.products.length, 1); assert.equal(catalog.categories.length, 1);
  assert.equal(catalog.getProductById('inactive'), undefined);
});
test('flags editoriais controlam seções e novidades é ordenada por criação', () => {
  const catalog = selectPublicCatalog({ categories: [category], products: [product, { ...product, id: 'new', featured: false, bestSeller: true, giftSection: false, createdAt: '2026-08-10T00:00:00Z', keywords: ['kit'] }, { ...product, id: 'unavailable', available: false }] });
  assert.equal(catalog.featuredProducts.length, 2);
  assert.equal(catalog.bestSellers[0].id, 'new');
  assert.equal(catalog.giftProducts.length, 1); // keyword kit does not set gift_section
  assert.equal(catalog.newArrivals[0].id, 'new');
  assert.equal(catalog.getProductById('unavailable').available, false);
});
test('busca por slug, inexistentes, categoria e busca textual com acentos', () => {
  const catalog = selectPublicCatalog({ categories: [category], products: [product] });
  assert.equal(catalog.getProductBySlug(row.slug).id, 'p-01');
  assert.equal(catalog.getProductBySlug('missing'), undefined);
  assert.equal(catalog.getCategoryBySlug('missing'), undefined);
  assert.equal(catalog.getProductsByCategory('maquiagem').length, 1);
  assert.equal(catalog.searchProducts('classico cris')[0].id, 'p-01');
  assert.equal(catalog.searchCategories('maquiagem')[0].id, 'cat-1');
  assert.equal(catalog.searchProducts('missing').length, 0);
});
test('sacola legada conserva quantidade/variação e resolve o preço canônico', () => {
  const raw = '[{"productId":"p-01","quantity":2,"variation":"Vermelho"},{"productId":"inactive","quantity":1}]';
  const lines = selection.parseStoredBag(raw);
  const items = selection.resolveStoredBag(lines, [product]);
  assert.equal(items.length, 1); assert.equal(items[0].product.price, 9.9);
  assert.equal(items[0].quantity, 2); assert.equal(items[0].variation, 'Vermelho');
  assert.equal(lines[1].productId, 'inactive'); // hidden IDs aren't erased from storage
  assert.equal(selection.resolveStoredBag(lines, [{ ...product, price: 8.9 }])[0].product.price, 8.9);
  assert.equal(selection.parseStoredFavorites('["p-01","inactive"]')[1], 'inactive');
});
test('armazenamento inválido é tolerado e indisponíveis mantêm a UX existente', () => {
  for (const raw of ['bad', '{}', 'null']) {
    assert.equal(selection.parseStoredBag(raw).length, 0);
    assert.equal(selection.parseStoredFavorites(raw).length, 0);
  }
  assert.equal(selection.parseStoredBag('[{"productId":"p-01","quantity":-1}]').length, 0);
  assert.equal(selection.resolveStoredBag([{ productId: 'p-01', quantity: 1 }], [{ ...product, available: false }])[0].product.available, false);
});
test('repositório público seleciona somente colunas públicas e filtra ativos', async () => {
  const calls = [];
  const client = { from(table) {
    const query = new Proxy({}, { get: (_, key) => key === 'then' ? resolve => resolve({ data: table === 'categories' ? [category] : [row], error: null }) : (...args) => { calls.push([table, key, ...args]); return query; } });
    return query;
  } };
  const { readPublicCatalog, PUBLIC_PRODUCT_COLUMNS } = load('lib/catalog/public-repository.ts');
  const data = await readPublicCatalog(client);
  assert.equal(data.products[0].price, 9.9);
  for (const table of ['categories', 'products']) assert.ok(calls.some(c => c[0] === table && c[1] === 'eq' && c[2] === 'active' && c[3] === true));
  assert.ok(!PUBLIC_PRODUCT_COLUMNS.includes('updated_at'));
});
test('erro remoto não retorna mocks silenciosamente', async () => {
  const query = new Proxy({}, { get: (_, key) => key === 'then' ? resolve => resolve({ data: null, error: { message: 'secret' } }) : () => query });
  await assert.rejects(load('lib/catalog/public-repository.ts').readPublicCatalog({ from: () => query }), /Não foi possível carregar/);
});
test('migration adiciona somente SELECT público e preserva policies administrativas', () => {
  const sql = fs.readFileSync(path.join(root, 'supabase/migrations/202610240001_public_catalog.sql'), 'utf8');
  assert.match(sql, /grant select on public.categories, public.products to anon/);
  assert.equal((sql.match(/for select to anon, authenticated/g) || []).length, 2);
  assert.match(sql, /active = true and exists/);
  assert.doesNotMatch(sql, /drop policy|grant (insert|update|delete)|for (insert|update|delete)/i);
});
test('nenhum consumidor público importa dados estáticos e salvamento invalida layout da loja', () => {
  function walk(dir) { return fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]); }
  for (const file of [...walk('app'), ...walk('components')].filter(f => /\.tsx?$/.test(f))) {
    assert.doesNotMatch(fs.readFileSync(path.join(root, file), 'utf8'), /@\/lib\/data\/(products|categories)/, file);
  }
  assert.match(fs.readFileSync(path.join(root, 'app/admin/(protected)/produtos/actions.ts'), 'utf8'), /revalidatePath\("\/\(loja\)", "layout"\)/);
});
