const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// Executa os módulos reais com as fronteiras Next/Supabase substituídas.
// Não simula nem substitui os testes de integração no projeto Supabase real.
function load(file, mocks = {}, env = {}) {
  const source = readFileSync(resolve(__dirname, '..', file), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(compiled, {
    module, exports: module.exports, URL, process: { env },
    require(name) {
      if (name === 'server-only') return {};
      if (name in mocks) return mocks[name];
      throw new Error(`Import sem mock: ${name}`);
    },
  }, { filename: file });
  return module.exports;
}
function redirect(path) { throw Object.assign(new Error(path), { redirect: path }); }
function setup(client, configured = true) {
  return {
    'next/navigation': { redirect },
    'next/cache': { revalidatePath() {} },
    '@/lib/supabase/server': { createClient: async () => client },
    '@/lib/supabase/config': { getSupabaseConfig: () => configured ? {} : null },
    '@/lib/admin/site-url': { getSiteUrl: () => 'https://makes.example' },
  };
}
const form = (values) => new Map(Object.entries(values));
const user = { id: 'admin-id' };

test('requireAdmin: visitante e configuração ausente redirecionam ao login', async () => {
  for (const configured of [true, false]) {
    const client = { auth: { getUser: async () => ({ data: { user: null } }) }, rpc: () => assert.fail('Sem identidade não consultar autorização') };
    const { requireAdmin } = load('lib/admin/auth.ts', setup(client, configured));
    await assert.rejects(requireAdmin(), { redirect: '/admin/login' });
  }
});
test('requireAdmin: cookie/identidade inválida nunca concede acesso', async () => {
  const client = { auth: { getUser: async () => ({ data: { user }, error: new Error('invalid') }) } };
  await assert.rejects(load('lib/admin/auth.ts', setup(client)).requireAdmin(), { redirect: '/admin/login' });
});
test('requireAdmin: conta comum, desabilitada e erro de autorização são bloqueados', async () => {
  for (const result of [{ data: false }, { data: null }, { data: true, error: new Error('offline') }]) {
    const client = { auth: { getUser: async () => ({ data: { user } }) }, rpc: async (name) => { assert.equal(name, 'is_admin'); return result; } };
    await assert.rejects(load('lib/admin/auth.ts', setup(client)).requireAdmin(), { redirect: '/admin/acesso-negado' });
  }
});
test('requireAdmin: somente autorização explícita concede acesso', async () => {
  const client = { auth: { getUser: async () => ({ data: { user } }) }, rpc: async () => ({ data: true }) };
  assert.equal((await load('lib/admin/auth.ts', setup(client)).requireAdmin()).user.id, user.id);
});
test('login: credenciais inválidas produzem mensagem neutra e não consultam admin', async () => {
  const client = { auth: { signInWithPassword: async () => ({ error: { message: 'User not found' } }) }, rpc: () => assert.fail() };
  const { login } = load('app/admin/actions.ts', setup(client));
  const result = await login({}, form({ email: 'cris@example.com', password: 'incorrect' }));
  assert.match(result.error, /Não foi possível entrar/);
  assert.doesNotMatch(result.error, /User not found/);
});
test('login: destinos fixos para administradora e usuário comum', async () => {
  for (const allowed of [true, false]) {
    const client = { auth: { signInWithPassword: async () => ({ error: null }) }, rpc: async () => ({ data: allowed }) };
    const { login } = load('app/admin/actions.ts', setup(client));
    await assert.rejects(login({}, form({ email: 'cris@example.com', password: 'secret', next: 'https://evil.example' })), { redirect: allowed ? '/admin' : '/admin/acesso-negado' });
  }
});
test('recuperação: e-mail existente, ausente e erro de transporte têm a mesma resposta', async () => {
  const messages = [];
  for (const outcome of ['success', 'unknown', 'network']) {
    const client = { auth: { resetPasswordForEmail: async (email, options) => {
      assert.equal(email, 'cris@example.com');
      assert.equal(options.redirectTo, 'https://makes.example/auth/confirm');
      if (outcome === 'network') throw new Error('offline');
      return { error: outcome === 'unknown' ? new Error('unknown email') : null };
    } } };
    messages.push((await load('app/admin/actions.ts', setup(client)).recoverPassword({}, form({ email: 'cris@example.com' }))).success);
  }
  assert.equal(new Set(messages).size, 1);
  assert.match(messages[0], /Se houver uma conta/);
});
test('redefinição: exige senha válida, confirmação e identidade validada', async () => {
  const client = { auth: { getUser: async () => ({ data: { user: null } }), updateUser: () => assert.fail() } };
  const { resetPassword } = load('app/admin/actions.ts', setup(client));
  assert.match((await resetPassword({}, form({ password: 'short', confirmation: 'short' }))).error, /12 a 128/);
  assert.match((await resetPassword({}, form({ password: 'a-long-password', confirmation: 'other-password' }))).error, /não coincidem/);
  assert.match((await resetPassword({}, form({ password: 'a-long-password', confirmation: 'a-long-password' }))).error, /sessão expirou/);
});
test('redefinição: atualiza senha e encerra sessões antes de voltar ao login', async () => {
  const events = [];
  const client = { auth: {
    getUser: async () => ({ data: { user } }),
    updateUser: async ({ password }) => { assert.equal(password, 'a-long-password'); events.push('update'); return {}; },
    signOut: async ({ scope }) => { assert.equal(scope, 'global'); events.push('logout'); return {}; },
  } };
  await assert.rejects(load('app/admin/actions.ts', setup(client)).resetPassword({}, form({ password: 'a-long-password', confirmation: 'a-long-password' })), { redirect: '/admin/login?senha=atualizada' });
  assert.deepEqual(events, ['update', 'logout']);
});
test('logout: falha não é apresentada como sucesso; sucesso volta ao login', async () => {
  for (const failure of [true, false]) {
    const client = { auth: { signOut: async ({ scope }) => { assert.equal(scope, 'global'); return { error: failure ? new Error('offline') : null }; } } };
    const { logout } = load('app/admin/actions.ts', setup(client));
    if (failure) assert.match((await logout({})).error, /Não foi possível sair/);
    else await assert.rejects(logout({}), { redirect: '/admin/login' });
  }
});
test('site URL: aceita origem canônica e bloqueia protocolos/credenciais/caminhos inesperados', () => {
  const get = (url, mode = 'production') => load('lib/admin/site-url.ts', {}, { NODE_ENV: mode, NEXT_PUBLIC_SITE_URL: url }).getSiteUrl();
  assert.equal(get('https://makes.example/'), 'https://makes.example');
  assert.equal(get('http://localhost:3000', 'development'), 'http://localhost:3000');
  for (const url of [undefined, '', 'javascript:alert(1)', 'https://user:pass@example.com', 'http://example.com', 'http://localhost:3000', 'https://example.com/elsewhere', 'https://example.com/?next=evil']) assert.equal(get(url), null);
});
test('confirmação: token inválido/expirado e tipo arbitrário nunca chegam à redefinição', async () => {
  for (const query of ['type=recovery&token_hash=expired', 'type=signup&token_hash=token', 'type=recovery']) {
    const mocks = setup({ auth: { verifyOtp: async () => ({ error: new Error('invalid') }) } });
    mocks['next/server'] = { NextResponse: { redirect: (url) => ({ url: url.toString(), headers: new Map() }) } };
    const response = await load('app/auth/confirm/route.ts', mocks).GET({ nextUrl: new URL(`https://makes.example/auth/confirm?${query}`) });
    assert.equal(response.url, 'https://makes.example/admin/recuperar-senha?erro=link');
  }
});
test('confirmação: token válido ignora redirecionamento externo e remove token da URL', async () => {
  const mocks = setup({ auth: { verifyOtp: async (input) => { assert.equal(input.type, 'recovery'); assert.equal(input.token_hash, 'valid'); return {}; } } });
  mocks['next/server'] = { NextResponse: { redirect: (url) => ({ url: url.toString(), headers: new Map() }) } };
  const response = await load('app/auth/confirm/route.ts', mocks).GET({ nextUrl: new URL('https://makes.example/auth/confirm?type=recovery&token_hash=valid&next=https://evil.example') });
  assert.equal(response.url, 'https://makes.example/admin/redefinir-senha');
  assert.match(response.headers.get('Cache-Control'), /no-store/);
});
