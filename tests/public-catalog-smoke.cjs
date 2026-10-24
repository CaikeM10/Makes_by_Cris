// Read-only storefront integration plus denied anonymous writes. No secret keys.
const assert = require('node:assert/strict');
require('node:process').loadEnvFile('.env.local');
const { createClient } = require('@supabase/supabase-js');
async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  assert.ok(url && key, 'Configure URL e publishable key');
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: categories, error: categoryError } = await client.from('categories').select('id,name,slug,active');
  assert.ifError(categoryError); assert.ok(categories.length > 0); assert.ok(categories.every(c => c.active));
  const { data: products, error } = await client.from('products').select('id,name,slug,price,credit_price,category_id,active');
  assert.ifError(error); assert.ok(products.length > 0);
  assert.ok(products.every(p => p.active && categories.some(c => c.id === p.category_id)));
  const product = products.find(p => p.slug === 'batom-matte-vermelho-classico');
  assert.ok(product); assert.equal(product.id, 'p-01');
  console.log(`SELECT anônimo real: ${categories.length} categorias públicas; ${products.length} produtos públicos.`);
  console.log(`Supabase: ${product.id}, ${product.slug}, PIX ${product.price}, crédito ${product.credit_price}.`);
  // Nonexistent ID ensures these probes could never mutate an existing record.
  for (const table of ['products', 'categories']) {
    const patch = await client.from(table).update({ name: 'RLS probe' }).eq('id', '__public_rls_probe_nonexistent__').select('id');
    assert.equal(patch.error?.code, '42501', `${table}: anonymous UPDATE must be denied`);
    const deletion = await client.from(table).delete().eq('id', '__public_rls_probe_nonexistent__');
    assert.equal(deletion.error?.code, '42501', `${table}: anonymous DELETE must be denied`);
    console.log(`${table}: UPDATE/DELETE anônimos negados (42501), sem alteração de registros.`);
  }
  const base = process.argv[2] || 'http://localhost:3100';
  const money = Number(product.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  for (const route of [`/produto/${product.slug}`, '/', `/categoria/${categories.find(c => c.id === product.category_id).slug}`]) {
    const response = await fetch(base + route);
    assert.equal(response.status, 200, route);
    const html = await response.text();
    assert.ok(html.includes(product.name), `${route}: nome canônico`);
    assert.ok(html.includes(money), `${route}: preço canônico ${money}`);
    console.log(`${route}: 200, nome e preço correspondem ao banco (${money}).`);
  }
  for (const route of ['/produto/nao-existe-no-catalogo', '/categoria/nao-existe-no-catalogo']) {
    const response = await fetch(base + route);
    const html = await response.text();
    assert.ok(response.status === 404 || html.includes('NEXT_HTTP_ERROR_FALLBACK;404'), route);
    console.log(`${route}: notFound confirmado.`);
  }
  for (const route of ['/admin/produtos', '/admin/produtos/p-01/editar']) {
    const response = await fetch(base + route, { redirect: 'manual' });
    assert.equal(response.status, 307); assert.equal(response.headers.get('location'), '/admin/login');
    console.log(`${route}: visitante redirecionado ao login.`);
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
