const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
function load(file, mocks = {}) {
  const module = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext(source, { module, exports: module.exports, process, Date, File, Blob, Uint8Array, console: { warn() {} }, require(name) {
    if (name in mocks) return mocks[name];
    if (name === 'server-only') return {};
    if (name === 'node:crypto') return require(name);
    if (name === 'react' || name === 'react/jsx-runtime') return require(name);
    const resolve = base => load(base + (fs.existsSync(path.join(root, base + '.ts')) ? '.ts' : '.tsx'), mocks);
    if (name.startsWith('@/')) return resolve(name.slice(2));
    if (name.startsWith('./')) return resolve(path.join(path.dirname(file), name));
    throw Error(name);
  } });
  return module.exports;
}
const images = load('lib/catalog/product-image.ts');
const { saveCatalogProduct, productSlug } = load('lib/catalog/save-product.ts');
const valid = { name: 'Batom Vermelho', brand: 'Cris', category_id: 'cat-1', short_description: 'Batom', description: 'Descrição completa', price: '12,50', credit_price: '14,90', active: true, available: false, featured: true, best_seller: true, gift_section: true };
const uuid = '12345678-1234-4234-8234-123456789abc';
const oldPath = `products/p-01/${uuid}.png`;
const version = '2026-10-24T12:00:00.123456Z';
const identity = { id: 'p-01', version };
function image() { return new File([Uint8Array.from([137,80,78,71,13,10,26,10,0,0,0,0])], 'untrusted-name.exe', { type: 'image/png' }); }
function fixture(options = {}) {
  const calls = [];
  const repo = {
    categories: async () => [{ id: 'cat-1' }],
    get: async () => ({ image: oldPath, updated_at: version }),
    slugExists: async slug => { calls.push(['slug', slug]); return false; },
    insert: async value => { calls.push(['insert', value]); return 'created'; },
    update: async (...args) => { calls.push(['update', ...args]); return true; },
    ...options.repo,
  };
  const storage = {
    upload: async (...args) => { calls.push(['upload', ...args]); },
    remove: async path => { calls.push(['remove', path]); },
    ...options.storage,
  };
  return { repo, storage, calls, save: (input = valid, file = image(), id) => saveCatalogProduct(repo, storage, input, file, id) };
}
test('criação válida gera UUID e preserva preços, flags, disponibilidade e datas do banco', async () => {
  const f = fixture(); const result = await f.save();
  assert.equal(result.error, undefined);
  assert.match(result.id, /^[0-9a-f-]{36}$/);
  const row = f.calls.find(c => c[0] === 'insert')[1];
  assert.equal(row.id, result.id); assert.equal(row.slug, 'batom-vermelho');
  assert.equal(row.price, '12.50'); assert.equal(row.credit_price, '14.90');
  for (const key of ['active', 'featured', 'best_seller', 'gift_section']) assert.equal(row[key], true);
  assert.equal(row.available, false);
  assert.equal(row.created_at, undefined); assert.equal(row.updated_at, undefined);
  assert.match(row.image, new RegExp(`^products/${result.id}/[a-f0-9-]+\\.png$`));
  assert.ok(f.calls.findIndex(c => c[0] === 'upload') < f.calls.findIndex(c => c[0] === 'insert'));
  assert.notEqual((await fixture().save()).id, result.id);
});
test('criação inativa conserva active=false', async () => {
  const f = fixture(); await f.save({ ...valid, active: false });
  assert.equal(f.calls.find(c => c[0] === 'insert')[1].active, false);
});
test('obrigatórios e categoria inválida bloqueiam upload e INSERT', async () => {
  for (const input of [{ ...valid, name: '' }, { ...valid, price: '-1' }, { ...valid, category_id: 'unknown' }]) {
    const f = fixture(); assert.ok((await f.save(input)).error); assert.equal(f.calls.length, 0);
  }
  const f = fixture(); assert.ok((await f.save(valid, null)).errors.image); assert.equal(f.calls.length, 0);
});
test('slug normaliza acentos, símbolos, fallback e comprimento', () => {
  assert.equal(productSlug('  Batom Vermélho! '), 'batom-vermelho');
  assert.equal(productSlug('💄'), 'produto'); assert.ok(productSlug('a'.repeat(200)).length <= 180);
});
test('colisão prévia e corrida no INSERT usam sufixos sem sobrescrever', async () => {
  const f = fixture({ repo: { slugExists: async slug => slug === 'batom-vermelho' } });
  let count = 0; const inserted = [];
  f.repo.insert = async row => { inserted.push(row.slug); return ++count === 1 ? 'slug-conflict' : 'created'; };
  assert.ok((await f.save()).id);
  assert.deepEqual(inserted, ['batom-vermelho-2', 'batom-vermelho-3']);
  assert.equal(f.calls.filter(c => c[0] === 'upload').length, 1);
});
test('MIME e limite inclusivo de 5 MiB são validados', () => {
  for (const type of ['image/jpeg', 'image/png', 'image/webp']) assert.equal(images.validateProductImage({ type, size: 5242880 }), undefined);
  for (const type of ['image/svg+xml', 'text/plain', 'image/gif', 'toString']) assert.ok(images.validateProductImage({ type, size: 12 }));
  assert.ok(images.validateProductImage({ type: 'image/png', size: 5242881 }));
  assert.ok(images.validateProductImage({ type: 'image/png', size: 0 }));
});
test('assinatura falsa ou arquivo grande é rejeitado antes de upload', async () => {
  for (const file of [new File(['evil'], 'photo.png', { type: 'image/png' }), new File([new Uint8Array(5242881)], 'photo.png', { type: 'image/png' })]) {
    const f = fixture(); assert.ok((await f.save(valid, file)).error); assert.equal(f.calls.length, 0);
  }
  assert.equal(await images.validateImageContent(image()), undefined);
  assert.equal(await images.validateImageContent(new Blob([Uint8Array.from([255,216,255])], { type: 'image/jpeg' })), undefined);
  assert.equal(await images.validateImageContent(new Blob(['RIFF0000WEBP'], { type: 'image/webp' })), undefined);
});
test('path seguro ignora nome original e resolve URL centralmente preservando legados', () => {
  assert.equal(images.productImagePath('p-01', uuid, 'image/png'), oldPath);
  assert.throws(() => images.productImagePath('../evil', uuid, 'image/png'));
  assert.equal(images.resolveProductImage(oldPath, 'https://example.supabase.co/'), `https://example.supabase.co/storage/v1/object/public/product-images/${oldPath}`);
  for (const local of ['/products/arquivo.webp', '/other/image.png', 'https://example.com/image.jpg']) {
    assert.equal(images.resolveProductImage(local, 'https://example.supabase.co'), local);
    assert.equal(images.isProductImagePath(local), false);
  }
  assert.equal(images.isProductImagePath('products/../../file.png'), false);
});
test('upload falha sem inserir produto e sem remover foto antiga', async () => {
  const f = fixture({ storage: { upload: async () => { throw Error('secret'); } } });
  const result = await f.save(); assert.match(result.error, /enviar a imagem/); assert.doesNotMatch(result.error, /secret/);
  assert.equal(f.calls.some(c => c[0] === 'insert' || c[0] === 'remove'), false);
});
test('falha no INSERT limpa somente a nova imagem', async () => {
  const f = fixture({ repo: { insert: async () => { throw Error('secret'); } } });
  assert.ok((await f.save()).error);
  assert.equal(f.calls.find(c => c[0] === 'remove')[1], f.calls.find(c => c[0] === 'upload')[1]);
});
test('substituição confirma banco antes de remover a imagem anterior', async () => {
  const f = fixture(); assert.ok((await f.save(valid, image(), identity)).id);
  const update = f.calls.find(c => c[0] === 'update');
  assert.equal(update[1], identity.id); assert.equal(update[2], version);
  assert.notEqual(update[3].image, oldPath);
  assert.equal(f.calls.at(-1)[1], oldPath);
});
test('edição sem imagem preserva referência; imagem local ou de outro produto nunca é removida', async () => {
  const f = fixture(); await f.save(valid, null, identity);
  assert.equal(f.calls.find(c => c[0] === 'update')[3].image, undefined);
  assert.equal(f.calls.some(c => c[0] === 'upload' || c[0] === 'remove'), false);
  for (const old of ['/products/local.webp', `products/other/${uuid}.png`]) {
    const f = fixture({ repo: { get: async () => ({ image: old, updated_at: version }) } });
    assert.ok((await f.save(valid, image(), identity)).id);
    assert.equal(f.calls.some(c => c[0] === 'remove'), false);
  }
});
test('falha ou conflito no UPDATE limpa imagem nova e conserva antiga', async () => {
  for (const update of [async () => false, async () => { throw Error('failure'); }]) {
    const f = fixture({ repo: { update } }); assert.ok((await f.save(valid, image(), identity)).error);
    const removed = f.calls.find(c => c[0] === 'remove')[1];
    assert.equal(removed, f.calls.find(c => c[0] === 'upload')[1]); assert.notEqual(removed, oldPath);
  }
});
test('falha ao limpar foto antiga não reverte produto salvo; falha de cleanup novo não expõe SDK', async () => {
  const f = fixture({ storage: { remove: async () => { throw Error('secret-token'); } } });
  const result = await f.save(valid, image(), identity);
  assert.equal(result.id, 'p-01'); assert.equal(result.error, undefined); assert.ok(result.warning);
  const failed = fixture({ repo: { insert: async () => { throw Error('secret'); } }, storage: { remove: async () => { throw Error('secret'); } } });
  assert.doesNotMatch((await failed.save()).error, /secret/);
});
test('Storage adapter usa bucket dedicado, upsert:false e recusa remover arquivo local', async () => {
  const calls = [];
  const storage = load('lib/catalog/product-storage.ts').createProductStorage({ storage: { from(bucket) { assert.equal(bucket, 'product-images'); return {
    upload: async (...args) => { calls.push(args); return { error: null }; }, remove: async () => assert.fail('local removal'),
  }; } } });
  await storage.upload(oldPath, image()); assert.equal(calls[0][2].upsert, false); assert.equal(calls[0][2].contentType, 'image/png');
  await assert.rejects(storage.remove('/products/local.webp'), /unmanaged/);
});
test('actions exigem admin e revalidam loja e admin após criação ou troca; erros não revalidam', async () => {
  for (const create of [true, false]) for (const fail of [true, false]) {
    const events = [];
    const actions = load('app/admin/(protected)/produtos/actions.ts', {
      '@/lib/admin/auth': { requireAdmin: async () => { events.push('auth'); return { supabase: {} }; } },
      '@/lib/catalog/supabase-repository': { createCatalogRepository: () => ({}) },
      '@/lib/catalog/product-storage': { createProductStorage: () => ({}) },
      '@/lib/catalog/save-product': { saveCatalogProduct: async () => { events.push('save'); return fail ? { error: 'falha' } : { id: uuid }; } },
      'next/cache': { revalidatePath: (...args) => events.push(args.join('|')) },
      'next/navigation': { redirect: url => { throw Error(url); } },
    });
    const call = () => create ? actions.createProduct({}, new FormData()) : actions.saveProduct('p-01', version, {}, new FormData());
    if (fail) assert.equal((await call()).error, 'falha');
    else { await assert.rejects(call(), create ? /editar\?criado=1/ : /salvo=1/); assert.ok(events.includes('/(loja)|layout')); assert.ok(events.includes('/admin/produtos')); }
    assert.equal(events[0], 'auth'); assert.equal(events[1], 'save');
    if (fail) assert.equal(events.length, 2);
  }
});
test('migration restringe escrita no Storage a admin e mantém INSERT produtos exclusivo de admin sem DELETE', () => {
  const sql = fs.readFileSync(path.join(root, 'supabase/migrations/202610240002_product_images.sql'), 'utf8');
  assert.match(sql, /true, 5242880, array\['image\/jpeg', 'image\/png', 'image\/webp'\]/);
  assert.equal((sql.match(/for (select|insert|delete) to authenticated/g) || []).length, 3);
  assert.equal((sql.match(/\(select public.is_admin\(\)\)/g) || []).length, 3);
  assert.doesNotMatch(sql, /to anon|for update|(?:insert into|delete from) storage.objects/i);
  const catalog = fs.readFileSync(path.join(root, 'supabase/migrations/202610230001_catalog.sql'), 'utf8');
  assert.match(catalog, /products_admin_insert[^;]+for insert to authenticated with check \(\(select public.is_admin\(\)\)\)/);
  assert.doesNotMatch(catalog, /grant[^;]*delete|for delete/i);
});

test('repositório distingue colisão de slug de outros erros e nunca usa upsert', async () => {
  for (const [error, expected] of [[null, 'created'], [{ code: '23505', message: 'duplicate products_slug_key' }, 'slug-conflict'], [{ code: '23505', message: 'duplicate products_pkey' }, 'error'], [{ code: '42501', message: 'denied' }, 'error']]) {
    const repo = load('lib/catalog/supabase-repository.ts').createCatalogRepository({ from: table => {
      assert.equal(table, 'products'); return { insert: async row => { assert.equal(row.created_at, undefined); return { error }; } };
    } });
    if (expected === 'error') await assert.rejects(repo.insert({ id: uuid }), /catalog-write/);
    else assert.equal(await repo.insert({ id: uuid }), expected);
  }
});

test('nenhuma action de criação ou edição escreve antes de exigir admin', async () => {
  const actions = load('app/admin/(protected)/produtos/actions.ts', {
    '@/lib/admin/auth': { requireAdmin: async () => { throw Error('denied'); } },
    '@/lib/catalog/supabase-repository': { createCatalogRepository: () => assert.fail() },
    '@/lib/catalog/product-storage': { createProductStorage: () => assert.fail() },
    '@/lib/catalog/save-product': { saveCatalogProduct: () => assert.fail() },
    'next/cache': {}, 'next/navigation': {},
  });
  await assert.rejects(actions.createProduct({}, new FormData()), /denied/);
  await assert.rejects(actions.saveProduct('p-01', version, {}, new FormData()), /denied/);
});

test('produto criado participa do catálogo, busca, categoria, seções e Novidades; inativo fica oculto', async () => {
  const f = fixture(); await f.save();
  const row = f.calls.find(c => c[0] === 'insert')[1];
  const category = { id: 'cat-1', name: 'Maquiagem', slug: 'maquiagem', active: true };
  const { mapPublicProduct } = load('lib/catalog/mappers.ts');
  const { selectPublicCatalog } = load('lib/catalog/public-catalog.ts');
  const product = mapPublicProduct({ ...row, available: true, keywords: [], variations: null, created_at: '2026-10-24T12:00:00Z' }, category);
  const snapshot = selectPublicCatalog({ categories: [category], products: [product] });
  assert.equal(snapshot.getProductBySlug(row.slug).id, row.id);
  assert.equal(snapshot.getProductsByCategory('maquiagem')[0].id, row.id);
  assert.equal(snapshot.searchProducts('batom')[0].id, row.id);
  for (const section of ['featuredProducts', 'bestSellers', 'giftProducts', 'newArrivals']) assert.equal(snapshot[section][0].id, row.id);
  assert.equal(selectPublicCatalog({ categories: [category], products: [{ ...product, active: false }] }).products.length, 0);
});

test('formulário compartilhado renderiza cadastro e edição com seleção de imagem e campos existentes', () => {
  const React = require('react');
  const { renderToString } = require('react-dom/server');
  const { ProductForm } = load('components/admin/product-form.tsx', {
    'next/link': { default: ({ href, children, ...props }) => React.createElement('a', { href, ...props }, children) },
    '@/app/admin/(protected)/produtos/actions': { createProduct: async () => ({}), saveProduct: async () => ({}) },
  });
  const categories = [{ id: 'cat-1', name: 'Maquiagem', active: true }];
  const created = renderToString(React.createElement(ProductForm, { categories }));
  assert.match(created, /Cadastrar produto/); assert.match(created, /Escolher foto/);
  for (const name of [...Object.keys(valid), 'image']) assert.ok(created.includes(`name="${name}"`), name);
  assert.match(created, /accept="image\/jpeg,image\/png,image\/webp"/);
  const edited = renderToString(React.createElement(ProductForm, { categories, product: { ...valid, image: '/products/legacy.webp', id: 'p-01', updated_at: version } }));
  assert.match(edited, /Alterar foto/); assert.match(edited, /Salvar alterações/); assert.match(edited, /src="\/products\/legacy.webp"/);
});
