const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { load } = require('./helpers/load-typescript.cjs');
const { openEdge } = require('./helpers/edge-cdp.cjs');
const base = process.env.QA_BASE || 'http://localhost:3101';

async function main() {
  const robots = await fetch(base + '/robots.txt');
  assert.equal(robots.status, 200); assert.match(await robots.text(), /Disallow: \/admin/);
  const sitemap = await fetch(base + '/sitemap.xml');
  assert.equal(sitemap.status, 200);
  const xml = await sitemap.text();
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => new URL(m[1]));
  assert.ok(urls.length > 5);
  assert.ok(urls.every(url => !/admin|checkout|sacola|favoritos|\/api\//.test(url.pathname)));
  const origin = urls[0].origin;
  const products = urls.filter(url => url.pathname.startsWith('/produto/')).slice(0, 3);
  assert.equal(products.length, 3);
  const category = urls.find(url => url.pathname.startsWith('/categoria/'));
  for (const route of ['/admin', '/admin/analytics']) {
    const r = await fetch(base + route, { redirect: 'manual' });
    assert.equal(r.status, 307); assert.match(r.headers.get('location'), /\/admin\/login/);
  }
  const edge = await openEdge();
  let server;
  try {
    for (const route of ['/', category.pathname, ...products.map(url => url.pathname), '/admin/login', '/checkout', '/sacola', '/favoritos', '/conta', '/pedido-enviado', '/pagina-inexistente-qa']) {
      const response = await fetch(base + route, { headers: { 'User-Agent': 'Googlebot' } });
      const html = await response.text();
      assert.equal(response.status, route === '/pagina-inexistente-qa' ? 404 : 200, route);
      assert.ok(html.includes('<h1'), route + ': H1 in initial HTML');
      if (route.startsWith('/produto/')) {
        assert.match(html, /application\/ld\+json/);
        assert.match(html, /property="og:image"/);
        assert.match(html, /rel="canonical"/);
      }
      await edge.send('Page.navigate', { url: base + route });
      let info;
      for (let n = 0; n < 100; n++) {
        await edge.sleep(150);
        info = await edge.evaluate(`({path:location.pathname, ready:document.readyState, title:document.title, canonical:document.querySelector('link[rel="canonical"]')?.href, robots:document.querySelector('meta[name="robots"]')?.content, ogTitle:document.querySelector('meta[property="og:title"]')?.content, ogImage:document.querySelector('meta[property="og:image"]')?.content, twitter:document.querySelector('meta[name="twitter:card"]')?.content, h1:document.querySelectorAll('h1').length, json:[...document.querySelectorAll('script[type="application/ld+json"]')].map(el=>JSON.parse(el.textContent))})`);
        if (info.path === route && info.ready === 'complete' && info.h1) break;
      }
      assert.equal(info.path, route); assert.equal(info.h1, 1, route + ': H1');
      if (route.startsWith('/admin') || ['/checkout', '/sacola', '/favoritos', '/conta', '/pedido-enviado', '/pagina-inexistente-qa'].includes(route)) assert.match(info.robots, /noindex/);
      else {
        assert.equal(info.canonical, origin + route);
        assert.ok(info.title.includes('Makes by Cris Martins'));
        assert.ok(info.ogTitle); assert.ok(info.twitter);
        if (route.startsWith('/produto/')) {
          assert.ok(info.ogImage);
          assert.ok(info.json.some(data => data['@type'] === 'Product' && data.offers.priceCurrency === 'BRL'));
        }
        if (route === '/') assert.ok(info.json.some(data => data['@type'] === 'Organization'));
      }
      console.log('HTTP/browser SEO:', route, JSON.stringify(info));
    }
    // Actual React component rendered in isolation, without adding any app route.
    const row = { label: '/produto/rota-de-produto-longa-para-validar-quebras-no-mobile', visitors: 12, pageviews: 30 };
    const sample = { since: '2026-11-09T00:00:00Z', until: '2026-11-15T12:00:00Z', updatedAt: new Date().toISOString(), recent: row, today: row, week: row, daily: [{ ...row, label: '2026-11-15T00:00:00Z' }], pages: [row], products: [{ ...row, label: 'Produto real com nome extenso para verificar responsividade' }], referrers: [{ ...row, label: 'instagram.com' }] };
    const css = fs.readdirSync('.next/static/chunks').filter(f => f.endsWith('.css')).map(f => fs.readFileSync(path.join('.next/static/chunks', f), 'utf8')).join('\n');
    const states = { loading: [null, '', true, Date.now()], success: [sample, '', false, Date.now()], empty: [{ ...sample, daily: [], pages: [], products: [], referrers: [], week: { ...row, visitors: 0, pageviews: 0 } }, '', false, Date.now()], error: [null, 'Não foi possível consultar a Vercel.', false, Date.now()], stale: [sample, 'Não foi possível atualizar.', false, Date.now()] };
    const markup = {};
    for (const [state, values] of Object.entries(states)) {
      let index = 0;
      const Component = load('components/admin/analytics-panel.tsx', { react: { ...React, useState: () => [values[index++], () => {}], useRef: () => ({ current: null }), useEffect: () => {}, useCallback: fn => fn } }).AnalyticsPanel;
      markup[state] = '<!doctype html><html lang="pt-BR"><meta name="viewport" content="width=device-width, initial-scale=1"><style>' + css + '</style><div class="admin-root"><main class="admin-main">' + renderToStaticMarkup(React.createElement(Component)) + '</main></div></html>';
    }
    server = http.createServer((req, res) => { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(markup[req.url.slice(1)] || markup.success); });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    for (const state of Object.keys(states)) for (const width of [390, 768, 1440]) {
      await edge.send('Emulation.setDeviceMetricsOverride', { width, height: 950, deviceScaleFactor: 1, mobile: width === 390 });
      await edge.send('Page.navigate', { url: `http://127.0.0.1:${server.address().port}/${state}` });
      await edge.sleep(180);
      const info = await edge.evaluate(`({overflow:document.documentElement.scrollWidth > innerWidth, text:document.body.innerText, button:document.querySelector('button')?.innerText})`);
      assert.equal(info.overflow, false, state + ' @ ' + width);
      assert.ok(info.button);
      if (state === 'loading') assert.match(info.text, /Carregando/);
      if (state === 'empty') assert.match(info.text, /Sem acessos registrados/);
      if (state === 'error') assert.match(info.text, /Não foi possível/);
      if (state === 'success') {
        const screenshot = await edge.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
        fs.writeFileSync(path.join(require('node:os').tmpdir(), `makes-analytics-${width}.png`), Buffer.from(screenshot.data, 'base64'));
      }
      console.log('Analytics responsive:', state, width, 'OK');
    }
  } finally { await edge.close(); if (server) await new Promise(resolve => server.close(resolve)); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
