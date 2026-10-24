// Manual remote integration check. Uses the publishable key and an admin login only.
// Creates at most one inactive test product. Never deletes products or edits real ones.
const { readFileSync } = require('node:fs');
const { parseEnv } = require('node:util');
const { randomUUID } = require('node:crypto');
const { Writable } = require('node:stream');
const readline = require('node:readline/promises');
const { createClient } = require('@supabase/supabase-js');
const config = parseEnv(readFileSync('.env.local', 'utf8'));
const url = config.NEXT_PUBLIC_SUPABASE_URL;
const key = config.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
const bucket = 'product-images';
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aMFAAAAAASUVORK5CYII=', 'base64');
function check(ok, label) { if (!ok) throw new Error(label); console.log(`PASS: ${label}`); }
function denied(error) { return Boolean(error && (error.code === '42501' || /row.level security|not authorized|permission denied|unauthorized/i.test(error.message || ''))); }
async function prompt(label, hidden = false) {
  if (!process.stdin.isTTY) throw new Error('Execute em terminal interativo ou defina ADMIN_TEST_EMAIL e ADMIN_TEST_PASSWORD localmente.');
  process.stdout.write(label);
  const output = hidden ? new Writable({ write(_chunk, _encoding, callback) { callback(); } }) : process.stdout;
  const rl = readline.createInterface({ input: process.stdin, output, terminal: true });
  try { return await rl.question(''); }
  finally { rl.close(); if (hidden) process.stdout.write('\n'); }
}
async function main() {
  if (!url || !key) throw new Error('Configuracao publica ausente.');
  const anon = createClient(url, key, options);
  const admin = createClient(url, key, options);
  const anonOnly = process.argv.includes('--anon-only');
  const id = randomUUID();
  const anonPath = `products/${id}/${randomUUID()}.png`;
  const upload = await anon.storage.from(bucket).upload(anonPath, png, { contentType: 'image/png', upsert: false });
  if (upload.error && !denied(upload.error)) console.log(JSON.stringify({ operation: 'anon-upload', name: upload.error.name, status: upload.error.status, statusCode: upload.error.statusCode, networkCode: upload.error.originalError?.cause?.code }));
  check(denied(upload.error), 'anon sem upload (RLS)');
  const categories = await anon.from('categories').select('id').eq('active', true).limit(1);
  check(!categories.error && categories.data?.length === 1, 'categoria publica disponivel');
  const row = {
    id, name: 'Produto Teste Admin', slug: `produto-teste-admin-smoke-${id}`, brand: 'Teste Admin', category_id: categories.data[0].id,
    short_description: 'Teste administrativo inativo', description: 'Registro reservado ao smoke de Storage; manter inativo.',
    price: '1.00', credit_price: '2.00', image: '/placeholder.svg', active: false, available: false,
    featured: false, best_seller: false, gift_section: false,
  };
  // Reuse this exact candidate if a broken anon policy unexpectedly inserts it.
  const inserted = await anon.from('products').insert(row);
  check(denied(inserted.error), 'anon sem INSERT de produto (permissao/RLS)');
  if (anonOnly) return;
  const email = process.env.ADMIN_TEST_EMAIL || config.ADMIN_TEST_EMAIL || await prompt('E-mail admin de teste: ');
  const password = process.env.ADMIN_TEST_PASSWORD || config.ADMIN_TEST_PASSWORD || await prompt('Senha (oculta): ', true);
  const login = await admin.auth.signInWithPassword({ email, password });
  check(!login.error, 'login de teste');
  const authorized = await admin.rpc('is_admin');
  check(!authorized.error && authorized.data === true, 'public.is_admin() = true');
  const existing = await admin.from('products').select('id,slug,image,active,updated_at').eq('name', row.name).like('slug', 'produto-teste-admin-smoke-%');
  check(!existing.error && existing.data.length <= 1, 'no maximo um registro reservado ao smoke');
  let product = existing.data[0];
  if (product) check(product.active === false && /^[0-9a-f-]{36}$/.test(product.id), 'registro de teste existente permanece inativo');
  const productId = product?.id || id;
  const firstPath = `products/${productId}/${randomUUID()}.png`;
  let attached = false;
  try {
    const result = await admin.storage.from(bucket).upload(firstPath, png, { contentType: 'image/png', upsert: false });
    check(!result.error, 'admin com upload');
    const publicUrl = admin.storage.from(bucket).getPublicUrl(firstPath).data.publicUrl;
    const response = await fetch(publicUrl);
    check(response.ok && response.headers.get('content-type')?.includes('image/png') && (await response.arrayBuffer()).byteLength === png.length, 'leitura publica real da imagem sem sessao');
    if (!product) {
      const created = await admin.from('products').insert({ ...row, image: firstPath }).select('id,slug,image,active,updated_at').single();
      check(!created.error && created.data?.active === false, 'admin com INSERT (um Produto Teste Admin, inativo)');
      product = created.data;
      attached = true;
    } else {
      const updated = await admin.from('products').update({ image: firstPath }).eq('id', product.id).eq('updated_at', product.updated_at).select('id').single();
      check(!updated.error && Boolean(updated.data), 'admin atualiza somente imagem do registro de teste');
      attached = true;
      const managed = new RegExp(`^products/${product.id}/[0-9a-f-]{36}\\.(png|jpg|webp)$`);
      if (managed.test(product.image)) {
        const removed = await admin.storage.from(bucket).remove([product.image]);
        check(!removed.error, 'cleanup da imagem anterior do teste via API');
      }
    }
    const hidden = await anon.from('products').select('id').eq('id', product.id);
    check(!hidden.error && hidden.data.length === 0, 'produto inativo invisivel para anon');
    console.log(JSON.stringify({ testProductId: product.id, active: false, retained: true }));
  } finally {
    if (!attached) {
      const removed = await admin.storage.from(bucket).remove([firstPath]);
      if (removed.error) console.log('PENDENTE: cleanup da imagem nova do smoke.');
    }
    // Local session only; no tokens are written to disk.
    await admin.auth.signOut({ scope: 'local' });
  }
}
main().catch(error => { console.error(`FAIL: ${error instanceof Error && /^(anon |categoria |Configuracao |Execute |login |public\.|no maximo |registro |admin |leitura |cleanup |produto )/.test(error.message) ? error.message : 'Falha de rede ou operacao remota; nenhum segredo foi registrado.'}`); process.exitCode = 1; });
