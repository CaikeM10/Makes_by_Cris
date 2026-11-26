// Requires cash-pricing-preview.cjs and isolated Chrome CDP on port 9224.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const out = 'docs/qa/cash-pricing';
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function main() {
  fs.mkdirSync(out, { recursive: true });
  const target = await (await fetch('http://127.0.0.1:9224/json/new?about:blank', { method: 'PUT' })).json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise(resolve => ws.addEventListener('open', resolve, { once: true }));
  let id = 0; const pending = new Map();
  ws.addEventListener('message', event => { const m = JSON.parse(event.data); if (!m.id) return; const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(Error(m.error.message)) : p.resolve(m.result); });
  const send = (method, params = {}) => new Promise((resolve, reject) => { const seq = ++id; pending.set(seq, { resolve, reject }); ws.send(JSON.stringify({ id: seq, method, params })); });
  const evaluate = async expression => { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw Error(JSON.stringify(r.exceptionDetails)); return r.result.value; };
  const results = [];
  try {
    await send('Page.enable');
    for (const width of [320, 360, 375, 390, 414, 768, 1440]) {
      await send('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width < 768 });
      for (const route of ['/', '/bag', '/checkout', '/product']) {
        await send('Page.navigate', { url: 'http://127.0.0.1:3101' + route });
        await delay(750);
        const metrics = await evaluate(`(() => {
          const rect=e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width}};
          return {width:innerWidth,scroll:document.documentElement.scrollWidth,title:document.body.innerText.slice(0,100),
            cards:[...document.querySelectorAll('#cards article')].map(e=>({rect:rect(e),price:rect(e.querySelector('.text-primary.font-serif')),button:rect(e.querySelector('button[aria-label$="à sacola"]')),text:e.innerText})),
            inputs:[...document.querySelectorAll('.catalog-price-columns input')].map(rect)};
        })()`);
        assert.ok(metrics.scroll <= width, JSON.stringify({ route, ...metrics }));
        assert.doesNotMatch(metrics.title, /Preview failed/);
        if (route === '/') {
          assert.equal(metrics.cards.length, 4);
          assert.match(metrics.cards[0].text, /79,90[\s\S]*em dinheiro[\s\S]*85,00[\s\S]*94,00/);
          assert.doesNotMatch(metrics.cards[2].text, /em dinheiro|no crédito/);
          if (width < 768) assert.equal(metrics.cards[0].rect.top, metrics.cards[1].rect.top);
          for (const card of metrics.cards) {
            assert.ok(card.button.width >= 35);
            assert.ok(card.price.right <= card.button.left || card.price.bottom <= card.button.top, JSON.stringify(card));
          }
          if (width >= 1200) assert.equal(metrics.inputs[0].top, metrics.inputs[2].top);
          else assert.ok(metrics.inputs[0].top < metrics.inputs[1].top && metrics.inputs[1].top < metrics.inputs[2].top);
        }
        const screenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
        const name = route === '/' ? 'catalog-admin' : route.slice(1);
        fs.writeFileSync(`${out}/${name}-${width}.png`, Buffer.from(screenshot.data, 'base64'));
        results.push({ route, width, noOverflow: true, ...metrics });
      }
    }
    fs.writeFileSync(`${out}/visual-results.json`, JSON.stringify({ scope: 'SSR production components + built CSS; local fixture data; no hydration or remote database writes', results }, null, 2));
    console.log(`Passed ${results.length} visual viewport checks.`);
  } finally { await send('Page.close'); ws.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
