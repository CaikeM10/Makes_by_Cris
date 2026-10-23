import assert from 'node:assert/strict';

// Execute contra uma instância local SEM Supabase configurado.
// Uso: node tests/admin-smoke.mjs http://localhost:3100
const base = process.argv[2] || 'http://localhost:3100';
for (const path of ['/admin', '/admin/redefinir-senha', '/admin/acesso-negado']) {
  const response = await fetch(`${base}${path}`, { redirect: 'manual' });
  assert.equal(response.status, 307, path);
  assert.match(response.headers.get('location'), /^\/admin\/(login|recuperar-senha)/);
  assert.match(response.headers.get('cache-control'), /no-store/);
  console.log(`${path}: ${response.status} → ${response.headers.get('location')}`);
}
for (const path of ['/admin/login', '/admin/recuperar-senha', '/', '/categorias', '/produto/batom-matte-vermelho-classico', '/favoritos', '/sacola', '/checkout']) {
  const response = await fetch(`${base}${path}`);
  assert.equal(response.status, 200, path);
  const html = await response.text();
  assert.ok(!html.includes('Application error'), path);
  if (path === '/admin/login') {
    assert.ok(html.includes('/logorenderizadacrisd.webp'));
    assert.ok(html.includes('Acesse seu'));
    assert.ok(html.includes('Acesso em configuração'));
    assert.ok(!html.includes('Lembrar de mim'));
  }
  console.log(`${path}: 200`);
}
const confirm = await fetch(`${base}/auth/confirm`, { redirect: 'manual' });
assert.equal(confirm.status, 503);
console.log('/auth/confirm: 503 explícito sem configuração');
