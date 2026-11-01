'use strict';
// Uses the installed Edge through CDP; no browser package or app test route needed.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'catalog-import');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function main() {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'makes-home-qa-'));
  const browser = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', [
    '--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=0',
    '--user-data-dir=' + profile, 'about:blank',
  ], { windowsHide: true, stdio: 'ignore' });
  let ws;
  try {
    let port;
    for (let i = 0; i < 60; i++) {
      const file = path.join(profile, 'DevToolsActivePort');
      if (fs.existsSync(file)) { port = fs.readFileSync(file, 'utf8').split('\n')[0]; break; }
      await sleep(250);
    }
    assert.ok(port, 'Edge debugging port');
    const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
    ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { ws.addEventListener('open', resolve); ws.addEventListener('error', reject); });
    let next = 0; const pending = new Map(); const exceptions = []; const failedRequests = [];
    ws.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      if (message.id && pending.has(message.id)) {
        const { resolve, reject, timer } = pending.get(message.id); clearTimeout(timer); pending.delete(message.id);
        message.error ? reject(Error(JSON.stringify(message.error))) : resolve(message.result);
      }
      if (message.method === 'Runtime.exceptionThrown') exceptions.push(message.params.exceptionDetails.text);
      if (message.method === 'Network.loadingFailed') failedRequests.push(message.params.errorText);
    });
    function send(method, params = {}) {
      return new Promise((resolve, reject) => { const id = ++next;
        const timer = setTimeout(() => { pending.delete(id); reject(Error('CDP timeout: ' + method)); }, 30000);
        pending.set(id, { resolve, reject, timer }); ws.send(JSON.stringify({ id, method, params }));
      });
    }
    async function evaluate(expression) {
      const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails));
      return result.result.value;
    }
    await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
    const results = [];
    for (const width of [1440, 768, 390]) {
      await send('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width === 390 });
      await send('Page.navigate', { url: 'http://localhost:3100/' });
      for (let i = 0; i < 100; i++) {
        if (await evaluate("document.readyState === 'complete' && document.querySelectorAll('article').length === 16 && [...document.images].every(img => img.complete)")) break;
        await sleep(300);
      }
      await sleep(3200); // Wait for the existing splash and hydration before exercising events.
      const state = await evaluate(`(() => {
        const sections = [...document.querySelectorAll('section')].filter(s => s.querySelector('h2'));
        const categories = sections.find(s => s.querySelector('h2').textContent === 'Categorias');
        const track = categories.querySelector('[class*="snap-x"]');
        const previous = track.scrollLeft; track.scrollLeft = track.scrollWidth;
        return { width: innerWidth, overflow: document.documentElement.scrollWidth > innerWidth,
          categories: [...categories.querySelectorAll('a[href^="/categoria/"]')].map(a => a.textContent.trim()),
          categoryCards: [...categories.querySelectorAll('a[href^="/categoria/"]')].map(a => ({ href: a.getAttribute('href'), name: a.querySelector('h3').textContent, count: parseInt(a.querySelector('p').textContent), image: a.querySelector('img').getAttribute('src') })),
          sections: sections.filter(s => s.querySelector('article')).map(s => ({ title: s.querySelector('h2').textContent, products: s.querySelectorAll('article').length })),
          brokenImages: [...document.images].filter(img => !img.complete || img.naturalWidth === 0).map(img => img.src),
          carouselScrollable: track.scrollWidth > track.clientWidth,
          carouselMoved: track.scrollLeft > previous,
          squareProductImages: [...document.querySelectorAll('article img')].every(img => Math.abs(img.width - img.height) <= 1),
          productNames: [...document.querySelectorAll('article h3 a')].map(a => a.textContent),
          productLinks: [...document.querySelectorAll('article h3 a')].map(a => a.getAttribute('href')) };
      })()`);
      assert.equal(state.overflow, false, 'Page overflow at ' + width);
      assert.equal(state.categories.length, 8); assert.equal(state.brokenImages.length, 0);
      assert.equal(state.sections.length, 4); assert.ok(state.sections.every(s => s.products === 4));
      assert.equal(state.squareProductImages, true);
      const publicNames = new Set(require('./fixtures/home-public-catalog.json').products.map(p => p.name));
      assert.ok(state.productNames.every(name => publicNames.has(name)), 'Only real products rendered');
      if (width < 1024) { assert.equal(state.carouselScrollable, true); assert.equal(state.carouselMoved, true); }
      assert.equal(await evaluate("document.querySelectorAll('footer a[href^=\"/categoria/\"]').length"), 8);
      await evaluate("document.querySelector('[class*=\"snap-x\"]').scrollLeft=0");
      const screenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
      fs.writeFileSync(path.join(output, 'home-' + width + '.png'), Buffer.from(screenshot.data, 'base64'));
      results.push(state);
    }
    // Force a browser image failure without touching the database or Storage.
    await evaluate("document.querySelector('article img').src='/deliberately-missing-qa-image.webp'");
    await sleep(1000);
    const fallback = await evaluate("(() => { const img=document.querySelector('article img'); return {src:img.getAttribute('src'),ok:img.complete && img.naturalWidth>0}; })()");
    assert.equal(fallback.src, '/placeholder.svg'); assert.equal(fallback.ok, true);
    // Continue shopping -> /categorias -> each real category, using the same live catalog.
    async function waitFor(expression) {
      for (let i = 0; i < 120; i++) {
        if (await evaluate(expression)) return;
        await sleep(250);
      }
      throw Error('Browser condition not satisfied: ' + expression);
    }
    const categoryResults = [];
    for (const width of [1440, 768, 390]) {
      await send('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width === 390 });
      if (width === 1440) {
        await send('Page.navigate', { url: 'http://localhost:3100/pedido-enviado' });
        await waitFor("location.pathname === '/pedido-enviado' && [...document.querySelectorAll('a')].some(a => a.textContent.trim() === 'Continuar comprando') && document.readyState === 'complete'");
        await sleep(3200);
        const destination = await evaluate("(() => { const a=[...document.querySelectorAll('a')].find(a => a.textContent.trim() === 'Continuar comprando'); const href=a.getAttribute('href'); a.click(); return href; })()");
        assert.equal(destination, '/categorias');
      } else {
        await send('Page.navigate', { url: 'http://localhost:3100/categorias' });
      }
      await waitFor("location.pathname === '/categorias' && document.querySelector('main h1')?.textContent === 'Categorias' && document.querySelectorAll('main a[href^=\"/categoria/\"]').length === 8 && [...document.images].every(img => img.complete)");
      await sleep(3200);
      const state = await evaluate(`(() => ({ width: innerWidth, overflow: document.documentElement.scrollWidth > innerWidth,
        cards: [...document.querySelectorAll('main a[href^="/categoria/"]')].map(a => ({ href: a.getAttribute('href'), name: a.querySelector('h3').textContent, count: parseInt(a.querySelector('p').textContent), image: a.querySelector('img').getAttribute('src') })),
        brokenImages: [...document.images].filter(img => !img.complete || img.naturalWidth === 0).map(img => img.src),
        gridColumns: getComputedStyle(document.querySelector('main .grid')).gridTemplateColumns.split(' ').length
      }))()`);
      assert.equal(state.overflow, false); assert.equal(state.brokenImages.length, 0);
      assert.equal(state.cards.length, 8); assert.ok(state.cards.every(c => c.count > 0));
      assert.equal(state.cards.reduce((sum, c) => sum + c.count, 0), 69);
      assert.ok(state.cards.every(c => !c.image.includes('placeholder') && !c.image.startsWith('/images/categorias/')));
      assert.deepEqual(state.cards, results[0].categoryCards, 'Home and /categorias share slugs, names, counts and images');
      assert.equal(state.gridColumns, width >= 1024 ? 3 : 2);
      const screenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
      fs.writeFileSync(path.join(output, 'categories-' + width + '.png'), Buffer.from(screenshot.data, 'base64'));
      categoryResults.push(state);
    }
    const categoryLinks = [];
    const fixture = require('./fixtures/home-public-catalog.json');
    for (const card of categoryResults[0].cards) {
      await send('Page.navigate', { url: 'http://localhost:3100' + card.href });
      await waitFor(`location.pathname === ${JSON.stringify(card.href)} && document.querySelector('main h1')?.textContent === ${JSON.stringify(card.name)} && document.querySelectorAll('main article').length === ${card.count} && [...document.images].every(img => img.complete)`);
      const detail = await evaluate(`(() => ({ path: location.pathname, title: document.querySelector('main h1').textContent,
        names: [...document.querySelectorAll('main article h3 a')].map(a => a.textContent),
        heroImage: document.querySelector('main img').getAttribute('src'),
        brokenImages: [...document.images].filter(img => !img.complete || img.naturalWidth === 0).length,
        overflow: document.documentElement.scrollWidth > innerWidth }))()`);
      const slug = card.href.split('/').pop();
      const expected = fixture.products.filter(p => p.category === slug && p.active && p.available).map(p => p.name).sort();
      assert.deepEqual([...detail.names].sort(), expected); assert.equal(detail.heroImage, card.image);
      assert.equal(detail.brokenImages, 0); assert.equal(detail.overflow, false);
      categoryLinks.push(detail);
    }
    assert.equal(exceptions.length, 0);
    fs.writeFileSync(path.join(output, 'home-browser-qa.json'), JSON.stringify({ results, fallback, exceptions, failedRequests, categoryResults, categoryLinks }, null, 2) + '\n');
    fs.writeFileSync(path.join(output, 'categories-browser-qa.json'), JSON.stringify({ categoryResults, categoryLinks, synchronizedWithHome: true, continueShopping: '/categorias', exceptions }, null, 2) + '\n');
    console.log(JSON.stringify({ viewports: results.map(r => ({ width: r.width, categories: r.categories.length, sections: r.sections, brokenImages: r.brokenImages.length, overflow: r.overflow, carouselMoved: r.carouselMoved })), fallback, exceptions }, null, 2));
    console.log(JSON.stringify({ categoryViewports: categoryResults.map(r => ({ width: r.width, cards: r.cards.length, total: r.cards.reduce((sum, c) => sum + c.count, 0), overflow: r.overflow, brokenImages: r.brokenImages.length })), linksVerified: categoryLinks.length, synchronizedWithHome: true }));
  } finally { if (ws) ws.close(); browser.kill(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
