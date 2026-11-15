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
    async function waitFor(expression) {
      for (let i = 0; i < 100; i++) {
        if (await evaluate(expression)) return;
        await sleep(200);
      }
      throw Error('Timeout: ' + expression);
    }
    async function navigate(route) {
      await send('Page.navigate', { url: 'http://localhost:3100' + route });
      await waitFor(`location.pathname === ${JSON.stringify(route)} && document.readyState === 'complete' && !!document.querySelector('main h1')`);
      await sleep(3500); // Let the existing welcome splash finish before visual capture.
      await evaluate(`Promise.all([...document.images].map(i => { i.loading = 'eager'; return i.decode().catch(() => {}); }))`);
    }
    async function state() {
      return evaluate(`({overflow:document.documentElement.scrollWidth > innerWidth,
        broken:[...document.images].filter(i=>!i.complete||!i.naturalWidth).map(i=>i.src),
        placeholders:[...document.querySelectorAll('main img')].filter(i=>i.src.includes('placeholder')).map(i=>i.src),
        images:[...document.querySelectorAll('main img')].map(i=>({src:i.getAttribute('src'),alt:i.alt})),
        names:[...document.querySelectorAll('main article h3')].map(e=>e.textContent)})`);
    }
    function check(s) { assert.equal(s.overflow,false); assert.deepEqual(s.broken,[]); assert.deepEqual(s.placeholders,[]); }
    const removed = ['Essencial Exclusivo','Essencial Oud','Essencial Sentir'];
    const fields = require('./fixtures/search-product-fields.json');
    const fixture = require('./fixtures/home-public-catalog.json');
    const sagaz = fixture.products.find(p=>p.name==='Homem Sagaz').image;
    for (const width of [390,768,1440]) {
      await send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width===390});
      await navigate('/categoria/perfumes-masculinos');
      const category = await state(); check(category);
      assert.ok(removed.every(n=>!category.names.includes(n)));
      assert.equal(category.images[0].src,sagaz);
      assert.ok(category.images.some(i=>i.src.includes('zaad-eau-tradicional.png')));
      fs.writeFileSync(path.join(output,`final-catalog-category-${width}.png`),Buffer.from((await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true})).data,'base64'));
      await evaluate(`(() => {const i=document.querySelector('input[aria-label="Buscar nesta categoria"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(i,'Essencial');i.dispatchEvent(new Event('input',{bubbles:true}));})()`);
      await sleep(500);
      assert.ok((await state()).names.every(n=>!removed.includes(n)));
      await navigate('/categorias');
      const cards = await state(); check(cards);
      assert.equal(await evaluate(`document.querySelector('main a[href="/categoria/perfumes-masculinos"] img').getAttribute('src')`),sagaz);
      const details=[];
      for (const [name,image] of [['Eau de Parfum Zaad Tradicional','zaad-eau-tradicional.png'],['Deleite 400ml','deleite400ml.png']]) {
        const p=fixture.products.find(p=>p.name===name);
        await navigate('/produto/'+fields[p.id].slug);
        const detail=await state();check(detail);
        assert.ok(detail.images.some(i=>i.src.includes(image)));
        details.push({name,...detail});
        fs.writeFileSync(path.join(output,`final-catalog-${image}-${width}.png`),Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
      }
      await evaluate(`document.querySelector('button[aria-label="Buscar produtos"]').click()`);
      await waitFor(`!!document.querySelector('input[aria-label="Buscar produtos"]')`);
      await evaluate(`(() => {const i=document.querySelector('input[aria-label="Buscar produtos"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(i,'perfumes masculinos');i.dispatchEvent(new Event('input',{bubbles:true}));})()`);
      await sleep(700);
      const searchText=await evaluate(`document.querySelector('[role="dialog"]').innerText`);
      assert.ok(removed.every(n=>!searchText.includes(n)));
      check(await state());
      results.push({width,category,cards,details,searchExcludesRemoved:true});
      const screenshot=await send('Page.captureScreenshot',{format:'png'});
      fs.writeFileSync(path.join(output,`final-catalog-${width}.png`),Buffer.from(screenshot.data,'base64'));
    }
    assert.deepEqual(exceptions,[]);
    fs.writeFileSync(path.join(output,'final-catalog-browser-qa.json'),JSON.stringify({results,exceptions,failedRequests},null,2)+'\n');
    console.log(JSON.stringify(results.map(r=>({width:r.width,brokenImages:0,overflow:false,masculineProducts:r.category.names,details:r.details.map(d=>d.name),searchExcludesRemoved:true})),null,2));
  } finally { if(ws)ws.close();browser.kill(); }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
