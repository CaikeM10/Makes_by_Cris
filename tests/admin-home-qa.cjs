'use strict';
// Read-only remote data + isolated rendering of real Admin components/styles.
// No authentication bypass route, credentials or writes are added to the app.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { parseEnv } = require('node:util');
const React = require('react');
const { renderToStaticMarkup: render } = require('react-dom/server');
const { createClient } = require('@supabase/supabase-js');
const { load } = require('./helpers/load-typescript.cjs');
const { openEdge } = require('./helpers/edge-cdp.cjs');
const root = path.resolve(__dirname, '..');
const env = parseEnv(fs.readFileSync(path.join(root, '.env.local'), 'utf8'));
const output = path.join(root, 'catalog-import');
const network = { reads: 0, writes: 0 };
async function transport(input, options = {}) {
  assert.ok(['GET', 'HEAD'].includes((options.method || 'GET').toUpperCase()), 'Read-only QA'); network.reads++;
  return fetch(input, { ...options, signal: AbortSignal.timeout(30000) });
}
function contrast(foreground, background) {
  const luminance = rgb => rgb.match(/[\d.]+/g).slice(0, 3).map(Number).map(n => n / 255)
    .map(n => n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4)
    .reduce((sum, n, i) => sum + n * [0.2126, 0.7152, 0.0722][i], 0);
  const a = luminance(foreground), b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
async function main() {
  const service = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: transport } });
  const snapshot = async () => {
    const results = await Promise.all(['products', 'categories'].map(table => service.from(table).select('*').order('id')));
    for (const result of results) assert.ifError(result.error);
    return results.map(r => r.data);
  };
  const before = await snapshot();
  const { readAdminCatalogSummary } = load('lib/catalog/admin-summary.ts');
  const summary = await readAdminCatalogSummary(service);
  const mocks = {
    '@/lib/admin/auth': { requireAdmin: async () => ({ supabase: service }) },
    '@/lib/catalog/admin-summary': { readAdminCatalogSummary: async () => summary },
    'next/link': { __esModule: true, default: ({ children, ...props }) => React.createElement('a', props, children) },
    'next/navigation': { usePathname: () => '/admin' },
    '@/app/admin/actions': { logout: () => {} },
    react: { ...React, useActionState: () => [{}, () => {}, false] },
  };
  const home = await load('app/admin/(protected)/page.tsx', mocks, env).default();
  const layout = await load('app/admin/(protected)/layout.tsx', mocks, env).default({ children: home });
  const chunks = fs.readdirSync(path.join(root, '.next/static/chunks')).filter(file => file.endsWith('.css'));
  const css = chunks.map(file => fs.readFileSync(path.join(root, '.next/static/chunks', file), 'utf8')).join('\n');
  const fontValue = name => css.match(new RegExp('--' + name + ':\\s*([^;}]+)'))?.[1];
  const html = '<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
    + chunks.map(file => `<link rel="stylesheet" href="/_next/static/chunks/${file}">`).join('')
    + `<style>:root{--font-manrope:${fontValue('font-manrope') || 'Arial'};--font-cormorant:${fontValue('font-cormorant') || 'Georgia'}}</style>`
    + '<body><div class="admin-root">' + render(layout) + '</div></body></html>';
  fs.writeFileSync(path.join(output, 'admin-home-visual.html'), html);
  const server = http.createServer((req, res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    if (pathname === '/') { res.setHeader('content-type', 'text/html; charset=utf-8'); res.end(html); return; }
    const staticRoot = pathname.startsWith('/_next/static/') ? path.join(root, '.next/static') : path.join(root, 'public');
    const relative = pathname.startsWith('/_next/static/') ? pathname.slice('/_next/static/'.length) : '.' + pathname;
    const file = path.resolve(staticRoot, relative);
    if (!file.startsWith(staticRoot + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); res.end(); return; }
    const mime = { '.css': 'text/css', '.woff2': 'font/woff2', '.webp': 'image/webp', '.svg': 'image/svg+xml' }[path.extname(file)];
    if (mime) res.setHeader('content-type', mime); res.end(fs.readFileSync(file));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await openEdge();
    const { send, evaluate, sleep } = browser;
    await send('DOM.enable'); await send('CSS.enable');
    const results = [];
    const capture = selector => evaluate(`(() => { const el=document.querySelector(${JSON.stringify(selector)}); const s=getComputedStyle(el); const r=el.getBoundingClientRect(); return { color:s.color, background:s.backgroundColor, outline:s.outlineStyle, outlineWidth:s.outlineWidth, outlineColor:s.outlineColor, cursor:s.cursor, width:r.width, height:r.height, opacity:s.opacity }; })()`);
    for (const width of [1440, 768, 390]) {
      await send('Emulation.setDeviceMetricsOverride', { width, height: 1100, deviceScaleFactor: 1, mobile: width === 390 });
      await send('Page.navigate', { url: `http://127.0.0.1:${server.address().port}/` });
      for (let i = 0; i < 80; i++) {
        if (await evaluate("document.readyState==='complete' && !!document.querySelector('.admin-home-actions') && [...document.images].every(i=>i.complete)")) break;
        await sleep(100);
      }
      await evaluate('document.fonts.ready');
      const state = await evaluate(`(() => ({ width:innerWidth, overflow:document.documentElement.scrollWidth>innerWidth,
        stats:[...document.querySelectorAll('dd')].map(el=>+el.textContent),
        links:[...document.querySelectorAll('.admin-home-actions a')].map(a=>({text:a.textContent,href:a.getAttribute('href')})),
        nav:[...document.querySelectorAll('.admin-sidebar nav a')].map(a=>({text:a.textContent.trim(),href:a.getAttribute('href'),active:a.getAttribute('aria-current')})),
        clipped:[...document.querySelectorAll('.admin-home-actions a,dt,dd')].filter(el=>el.scrollWidth>el.clientWidth+1).length,
        summaryColumns:getComputedStyle(document.querySelector('.admin-summary-grid')).gridTemplateColumns.split(' ').length,
        sidebarColumns:getComputedStyle(document.querySelector('.admin-shell')).gridTemplateColumns.split(' ').length
      }))()`);
      assert.equal(state.overflow, false); assert.equal(state.clipped, 0);
      assert.deepEqual(state.stats, [summary.totalProducts, summary.activeProducts, summary.populatedCategories, summary.provisionalImages]);
      assert.equal(state.sidebarColumns, width >= 768 ? 2 : 1);
      const cta = await capture('.admin-home-actions .admin-button');
      cta.contrast = contrast(cta.color, cta.background); assert.ok(cta.contrast >= 4.5);
      const logout = await capture('.admin-logout'); assert.ok(logout.height >= 44);
      const sidebarColor = await evaluate("getComputedStyle(document.querySelector('.admin-sidebar')).backgroundColor");
      logout.contrast = contrast(logout.color, sidebarColor); assert.ok(logout.contrast >= 4.5);
      const doc = await send('DOM.getDocument');
      const { nodeId } = await send('DOM.querySelector', { nodeId: doc.root.nodeId, selector: '.admin-home-actions .admin-button' });
      const states = {};
      for (const pseudo of [['hover'], ['hover', 'active']]) {
        await send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: pseudo });
        const style = await capture('.admin-home-actions .admin-button');
        style.contrast = contrast(style.color, style.background); assert.ok(style.contrast >= 4.5);
        states[pseudo.at(-1)] = style;
      }
      await send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: [] });
      await evaluate('document.activeElement?.blur()');
      for (let i = 0; i < 12; i++) {
        await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
        await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
        if (await evaluate("document.activeElement?.textContent === 'Gerenciar produtos'")) break;
      }
      assert.equal(await evaluate("document.activeElement?.textContent === 'Gerenciar produtos'"), true);
      const focus = await capture('.admin-home-actions .admin-button'); assert.equal(focus.outline, 'solid'); assert.equal(focus.outlineWidth, '3px');
      await evaluate("const b=document.createElement('button');b.className='admin-button';b.disabled=true;b.textContent='Aguarde';b.id='qa-disabled';document.querySelector('.admin-home-actions').append(b)");
      const disabled = await capture('#qa-disabled'); disabled.contrast = contrast(disabled.color, disabled.background); assert.ok(disabled.contrast >= 4.5);
      await evaluate("document.querySelector('#qa-disabled').remove()");
      await evaluate('window.scrollTo(0,0)'); await sleep(100);
      const screenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
      fs.writeFileSync(path.join(output, `admin-home-${width}.png`), Buffer.from(screenshot.data, 'base64'));
      results.push({ ...state, cta, logout, states, focus, disabled });
    }
    assert.equal(browser.exceptions.length, 0);
    assert.deepEqual(await snapshot(), before);
    const report = { summary, results, network, remoteDataIntact: true, exceptions: browser.exceptions,
      visualScope: 'Real components and production CSS in an isolated harness; no live authenticated session or real logout was used.' };
    fs.writeFileSync(path.join(output, 'admin-home-qa.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report, null, 2));
  } finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
