// Run against a local server and isolated headless Chrome on port 9223.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const base = process.argv[2] || 'http://localhost:3100';
const delay = ms => new Promise(r => setTimeout(r, ms));
async function main() {
  const target = await (await fetch('http://localhost:9223/json/new?about:blank', { method: 'PUT' })).json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r, { once: true }));
  let id = 0; const pending = new Map();
  ws.addEventListener('message', event => { const m = JSON.parse(event.data); if (m.id) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(Error(m.error.message)) : p.resolve(m.result); } });
  const send = (method, params = {}) => new Promise((resolve, reject) => { const seq = ++id; pending.set(seq, { resolve, reject }); ws.send(JSON.stringify({ id: seq, method, params })); });
  async function evaluate(expression) { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw Error(JSON.stringify(r.exceptionDetails)); return r.result.value; }
  async function wait(expr) { for (let i = 0; i < 100; i++) { if (await evaluate(expr)) return; await delay(150); } throw Error('Timeout: ' + expr); }
  async function click(selector) { await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`); await delay(120); }
  async function choose(selector, text) { await click(selector); await wait(`Array.from(document.querySelectorAll('[role="option"]')).some(e=>e.innerText.trim()===${JSON.stringify(text)})`); await evaluate(`Array.from(document.querySelectorAll('[role="option"]')).find(e=>e.innerText.trim()===${JSON.stringify(text)}).click()`); await delay(120); }
  async function input(selector, value) { await evaluate(`(() => {const e=document.querySelector(${JSON.stringify(selector)}); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));})()`); await delay(80); }
  async function submit() { await evaluate(`document.querySelector('form').requestSubmit()`); await delay(200); }
  const results = [];
  try {
    await send('Page.enable');
    await send('Page.navigate', { url: base + '/categorias' });
    await wait(`document.readyState==='complete' && location.pathname==='/categorias'`);
    // Use a current real product ID from the read-only audit, only in this isolated browser's bag.
    const plan = require('../catalog-import/final-image-audit/catalog-image-migration-plan.json');
    const productId = plan.entries.find(e => e.status === 'READY').productId;
    await evaluate(`localStorage.setItem('makes:sacola',JSON.stringify([{productId:${JSON.stringify(productId)},quantity:1}]))`);
    for (const width of [390, 768, 1440]) {
      await send('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width === 390 });
      await send('Page.navigate', { url: base + '/checkout' });
      await wait(`!!document.querySelector('#name')`);
      await delay(3200);
      await evaluate(`window.__opened=[];window.open=(url)=>{window.__opened.push(url);return null}`);
      await input('#name', 'Cliente Teste'); await input('#whatsapp', '88999999999');
      await click('[id="receiving-delivery"]');
      await choose('#city', 'Outra cidade');
      await wait(`!!document.querySelector('#deliveryCity')`);
      assert.match(await evaluate(`document.querySelector('#city').innerText`), /Outra cidade/);
      await submit();
      assert.equal(await evaluate('window.__opened.length'), 0);
      for (const field of ['deliveryCity', 'deliveryState', 'street', 'district']) assert.ok(await evaluate(`!!document.querySelector('#${field}-error')`), field);
      await input('#deliveryCity', 'Fortaleza');
      await choose('#deliveryState', 'CE');
      await input('#street', 'Rua Principal'); await input('#district', 'Centro');
      const metrics = await evaluate(`({width:innerWidth,scroll:document.documentElement.scrollWidth,fields:['deliveryCity','deliveryState','street','district'].map(id=>{const e=document.getElementById(id),r=e.getBoundingClientRect();return {id,left:r.left,right:r.right,label:!!document.querySelector('label[for="'+id+'"]')}})})`);
      assert.ok(metrics.scroll <= width, JSON.stringify(metrics));
      for (const f of metrics.fields) assert.ok(f.left >= 0 && f.right <= width && f.label, JSON.stringify(f));
      await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true }).then(r => fs.writeFileSync(`catalog-import/final-image-audit/checkout-national-${width}.png`, Buffer.from(r.data, 'base64')));
      await submit();
      const opened = await evaluate('window.__opened'); assert.equal(opened.length, 1);
      const message = new URL(opened[0]).searchParams.get('text');
      assert.match(message, /Cidade: Fortaleza - CE/); assert.match(message, /Rua: Rua Principal/); assert.match(message, /Frete a combinar/); assert.doesNotMatch(message, /undefined|null|Grátis/);
      await wait(`location.pathname==='/pedido-enviado'`);
      results.push({ width, noOverflow: true, labels: true, requiredFieldsBlockSubmit: true, stateSelectWorks: true, whatsappMessage: message, submitRedirect: true });
      await evaluate(`localStorage.setItem('makes:sacola',JSON.stringify([{productId:${JSON.stringify(productId)},quantity:1}]))`);
    }
    fs.writeFileSync('catalog-import/final-image-audit/checkout-national-browser.json', JSON.stringify(results, null, 2));
    console.log(JSON.stringify(results.map(({ whatsappMessage, ...r }) => r), null, 2));
  } finally { ws.close(); }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
