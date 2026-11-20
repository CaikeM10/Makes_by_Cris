const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./helpers/load-typescript.cjs');
const env = { VERCEL_TOKEN: 'server-test-token', VERCEL_PROJECT_ID: 'prj_test', VERCEL_TEAM_ID: 'team_test' };
const cache = { unstable_cache: fn => fn };

test('analytics: official queries preserve unique visitors, UTC periods, auth and public filters', async () => {
  const calls = [];
  const api = load('lib/admin/analytics.ts', { 'next/cache': cache, fetch: undefined }, env);
  // The loader resolves global fetch, so use a local wrapper for this module.
  const fs = require('node:fs'); const vm = require('node:vm'); const ts = require('typescript');
  const module = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/admin/analytics.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    module, exports: module.exports, require: n => n === 'server-only' ? {} : cache,
    process: { env }, URL, AbortSignal,
    fetch: async (url, options) => {
      calls.push({ url: new URL(url), options });
      const by = url.searchParams.get('by');
      return { ok: true, json: async () => ({ data: [{ ...(by === 'day' ? { timestamp: '2026-11-15T00:00:00Z' } : by === 'environment' ? { environment: 'production' } : { [by]: by === 'requestPath' ? '/produto/teste' : 'google.com' }), pageviews: 10, visitors: 4 }] }) };
    },
  });
  const result = await module.exports.queryAnalytics(new Date('2026-11-15T12:00:00Z'));
  assert.equal(calls.length, 7);
  assert.equal(result.week.visitors, 4);
  assert.equal(result.since, '2026-11-09T00:00:00.000Z');
  assert.equal(calls[0].url.searchParams.get('since'), '2026-11-15T11:55:00.000Z');
  for (const { url, options } of calls) {
    assert.equal(url.origin + url.pathname, 'https://api.vercel.com/v1/query/web-analytics/visits/aggregate');
    assert.ok(url.searchParams.get('by'));
    assert.equal(url.searchParams.get('projectId'), 'prj_test');
    assert.equal(url.searchParams.get('teamId'), 'team_test');
    assert.match(url.searchParams.get('filter'), /production.*\/admin.*\/api\/.*\/auth\//);
    assert.equal(options.headers.Authorization, 'Bearer server-test-token');
    assert.equal(options.redirect, 'error');
  }
  assert.ok(api.analyticsConfigured());
  assert.equal(load('lib/admin/analytics.ts', { 'next/cache': cache }).analyticsConfigured(), false);
});

test('analytics: malformed, missing, negative and non-finite metrics fail instead of becoming zeros', () => {
  const { trafficRows } = load('lib/admin/analytics.ts', { 'next/cache': cache });
  for (const payload of [null, {}, { data: null }, { data: [{ pageviews: -1, visitors: 3 }] }, { data: [{ pageviews: Infinity, visitors: 3 }] }, { data: [{ pageviews: 2 }] }]) assert.throws(() => trafficRows(payload), /analytics-schema/);
  assert.equal(trafficRows({ data: [] }).length, 0);
});

const responseMock = { NextResponse: { json: (body, options) => ({ body, ...options }) } };
test('analytics route: authorization runs before configuration and any private data access', async () => {
  for (const reason of ['/admin/login', '/admin/acesso-negado']) {
    const route = load('app/api/admin/analytics/route.ts', {
      'next/server': responseMock,
      '@/lib/admin/auth': { requireAdmin: async () => { throw Error(reason); } },
      '@/lib/admin/analytics': { analyticsConfigured: () => assert.fail('Auth first'), readAnalytics: () => assert.fail('Auth first') },
      '@/lib/catalog/public-server': {},
    });
    await assert.rejects(route.GET(), e => e.message === reason);
  }
});

test('analytics route: missing credentials and upstream failure stay private without secret leakage', async () => {
  for (const configured of [false, true]) {
    const route = load('app/api/admin/analytics/route.ts', {
      'next/server': responseMock,
      '@/lib/admin/auth': { requireAdmin: async () => ({}) },
      '@/lib/admin/analytics': { analyticsConfigured: () => configured, readAnalytics: async () => { throw Error('Bearer secret-token private-body'); } },
      '@/lib/catalog/public-server': {},
    });
    const response = await route.GET();
    assert.equal(response.status, configured ? 502 : 503);
    assert.match(response.headers['Cache-Control'], /private, no-store/);
    assert.doesNotMatch(JSON.stringify(response), /secret-token|private-body/);
  }
});

test('analytics route resolves known slugs and preserves unknown routes without external lookups', async () => {
  const route = load('app/api/admin/analytics/route.ts', {
    'next/server': responseMock,
    '@/lib/admin/auth': { requireAdmin: async () => ({}) },
    '@/lib/admin/analytics': { analyticsConfigured: () => true, readAnalytics: async () => ({ products: [{ label: '/produto/conhecido', visitors: 2, pageviews: 3 }, { label: '/produto/removido', visitors: 1, pageviews: 2 }] }) },
    '@/lib/catalog/public-server': { getPublicCatalog: async () => ({ getProductBySlug: slug => slug === 'conhecido' ? { name: 'Nome real' } : null }) },
  });
  const { body } = await route.GET();
  assert.equal(body.products[0].label, 'Nome real');
  assert.equal(body.products[1].label, '/produto/removido');
});


test('admin analytics UI uses the protected page, compact home and active navigation', () => {
  const fs = require('node:fs');
  const read = p => fs.readFileSync(p, 'utf8');
  assert.match(read('app/admin/(protected)/layout.tsx'), /await requireAdmin\(\)/);
  assert.match(read('app/admin/(protected)/analytics/page.tsx'), /<AnalyticsPanel \/>/);
  assert.match(read('app/admin/(protected)/page.tsx'), /<AnalyticsPanel compact \/>/);
  const panel = read('components/admin/analytics-panel.tsx');
  assert.match(panel, /fetch\('\/api\/admin\/analytics'/);
  assert.match(panel, /!compact && <><section/);
  const nav = read('components/admin/admin-navigation.tsx');
  assert.match(nav, /link\("\/admin\/analytics", "Analytics"\)/);
  assert.match(nav, /aria-current=\{active \? "page"/);
});
