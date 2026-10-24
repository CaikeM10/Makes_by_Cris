const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');
function load(file, mocks = {}) {
  const module = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '..', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(source, { module, exports: module.exports, Date, process: { env: {} }, require: name => {
    if (name === 'server-only') return {};
    if (name in mocks) return mocks[name];
    if (name.startsWith('./')) return load('lib/catalog/' + name.slice(2) + '.ts', mocks);
    throw Error(name);
  } });
  return module.exports;
}
const validation = load('lib/catalog/validation.ts');
const valid = { name: 'Kit Presente Completo', brand: 'Cris', category_id: 'cat-6', short_description: 'Presente', description: 'Descrição completa', price: '139,90', credit_price: '149,90', active: true, available: true, featured: false, best_seller: false, gift_section: true };
const version = '2026-10-23T12:00:00.123456Z';
test('validação central aceita preços independentes e rejeita valores ambíguos', () => {
  assert.equal(validation.validateProduct(valid).data.price, '139.90');
  assert.equal(validation.validateProduct({ ...valid, credit_price: '1,00' }).data.credit_price, '1.00');
  for (const price of ['-1', '1.234,50', '1e2', 'Infinity', 'NaN', '', '2.999', '10000000000']) assert.equal(validation.validateProduct({ ...valid, price }).data, undefined);
});
test('validação rejeita campos vazios, longos, categoria e flags inválidas', () => {
  for (const patch of [{ name: ' ' }, { brand: 'a'.repeat(121) }, { category_id: '' }, { active: 'true' }, { description: '' }]) assert.equal(validation.validateProduct({ ...valid, ...patch }).data, undefined);
});
test('patch permite somente campos editáveis, preserva slug, imagem, datas e metadados', () => {
  const result = validation.validateProduct({ ...valid, slug: 'evil', image: 'changed', created_at: 'today', keywords: [], catalog_order: 99 });
  assert.deepEqual(Object.keys(result.data).sort(), Object.keys(valid).sort());
});
test('filtros normalizam URL, categorias, busca e paginação', () => {
  const f = validation.parseFilters({ q: ' Kit ', filter: 'inactive', category: 'cat-6', page: '2' });
  assert.equal(f.q, 'Kit'); assert.equal(f.filter, 'inactive'); assert.equal(f.page, 2); assert.equal(f.category, 'cat-6');
  assert.equal(validation.parseFilters({ filter: 'sql', page: '-10', q: ['x'] }).filter, 'all');
  assert.equal(validation.parseFilters({ page: '-10' }).page, 1);
});
test('mapper mantém preços separados, IDs e precisão da versão', () => {
  const p = load('lib/catalog/mappers.ts').mapProduct({ id: 'p-21', price: 149.9, credit_price: '159.90', updated_at: version, active: false });
  assert.equal(p.price, '149.90'); assert.equal(p.credit_price, '159.90'); assert.equal(p.updated_at, version); assert.equal(p.active, false);
});
test('operação valida categoria e dados antes de persistir', async () => {
  const { updateProduct } = load('lib/catalog/update-product.ts');
  const repo = { categories: async () => [], update: () => assert.fail('Não gravar') };
  assert.match((await updateProduct(repo, 'p-21', version, valid)).error, /categoria/);
  assert.match((await updateProduct(repo, 'p-21', version, { ...valid, price: '-1' })).error, /campos/);
});
test('operação detecta conflito sem sobrescrever e oculta erros de persistência', async () => {
  const { updateProduct } = load('lib/catalog/update-product.ts');
  for (const outcome of ['saved', 'conflict', 'error']) {
    const repo = { categories: async () => [{ id: 'cat-6' }], update: async (id, token, patch) => {
      assert.equal(id, 'p-21'); assert.equal(token, version); assert.equal(patch.credit_price, '149.90');
      if (outcome === 'error') throw Error('secret database error');
      return outcome === 'saved';
    } };
    const result = await updateProduct(repo, 'p-21', version, valid);
    if (outcome === 'saved') assert.equal(result.error, undefined);
    if (outcome === 'conflict') assert.match(result.error, /outra sessão/);
    if (outcome === 'error') { assert.match(result.error, /Não foi possível/); assert.doesNotMatch(result.error, /secret/); }
  }
});
test('repositório aplica filtros e atualização atômica por ID e versão', async () => {
  const calls = [];
  const query = new Proxy({}, { get: (_, key) => key === 'then' ? resolve => resolve({ data: [], count: 0, error: null }) : (...args) => { calls.push([key, ...args]); return query; } });
  const repo = load('lib/catalog/supabase-repository.ts').createCatalogRepository({ from: name => { calls.push(['from', name]); return query; } });
  await repo.list({ q: '', filter: 'inactive', category: 'cat-6', page: 2 });
  assert.ok(calls.some(c => c[0] === 'eq' && c[1] === 'active' && c[2] === false));
  assert.ok(calls.some(c => c[0] === 'range' && c[1] === 24 && c[2] === 47));
  await repo.update('p-21', version, { price: '139.90' });
  assert.ok(calls.some(c => c[0] === 'eq' && c[1] === 'updated_at' && c[2] === version));
});
test('action verifica autorização antes de consultar ou escrever', async () => {
  const { saveProduct } = load('app/admin/(protected)/produtos/actions.ts', {
    '@/lib/admin/auth': { requireAdmin: async () => { throw Error('denied'); } },
    '@/lib/catalog/supabase-repository': { createCatalogRepository: () => assert.fail() },
    '@/lib/catalog/update-product': {}, '@/lib/catalog/validation': validation,
    '@/lib/catalog/save-product': {}, '@/lib/catalog/product-storage': {},
    'next/cache': {}, 'next/navigation': {},
  });
  await assert.rejects(saveProduct('p-21', version, {}, new Map()), /denied/);
});
test('seed contém 6 categorias, 23 produtos e não sobrescreve edições', () => {
  const seed = fs.readFileSync(path.resolve(__dirname, '../supabase/seeds/catalog.sql'), 'utf8');
  assert.equal((seed.match(/\('cat-\d+'/g) || []).length, 6);
  assert.equal((seed.match(/\('p-\d+'/g) || []).length, 23);
  assert.equal((seed.match(/on conflict \(id\) do nothing/g) || []).length, 2);
  assert.match(seed, /2026-07-15T00:00:00Z/);
});
