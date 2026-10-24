// Run Chrome headless with --remote-debugging-port=9223 and an isolated profile.
// Does not touch the normal browser profile or any real visitor's localStorage.
const assert = require('node:assert/strict');
const base = process.argv[2] || 'http://localhost:3100';
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function closeBrowser() {
  const info = await (await fetch('http://localhost:9223/json/version')).json();
  const socket = new WebSocket(info.webSocketDebuggerUrl);
  await new Promise(resolve => { socket.addEventListener('open', () => socket.send(JSON.stringify({ id: 1, method: 'Browser.close' }))); socket.addEventListener('close', resolve, { once: true }); });
}
async function main() {
  let target;
  for (let attempt = 0; attempt < 25 && !target; attempt++) {
    try { target = await (await fetch('http://localhost:9223/json/new?about:blank', { method: 'PUT' })).json(); }
    catch { await delay(200); }
  }
  assert.ok(target, 'Chrome debugging endpoint indisponível');
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise(resolve => ws.addEventListener('open', resolve, { once: true }));
  let sequence = 0;
  const pending = new Map();
  ws.addEventListener('message', event => {
    const result = JSON.parse(event.data);
    if (result.id) { const job = pending.get(result.id); if (job) { pending.delete(result.id); result.error ? job.reject(Error(result.error.message)) : job.resolve(result.result); } }
  });
  function send(method, params = {}) {
    const id = ++sequence;
    return new Promise((resolve, reject) => { pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); });
  }
  async function evaluate(expression) {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw Error(result.exceptionDetails.text);
    return result.result.value;
  }
  async function waitFor(expression) {
    for (let i = 0; i < 100; i++) {
      try { if (await evaluate(expression)) return; } catch {}
      await delay(150);
    }
    throw Error('Browser timeout: ' + expression);
  }
  async function navigate(route) {
    await send('Page.navigate', { url: base + route });
    await waitFor(`location.pathname === ${JSON.stringify(route)} && document.readyState === 'complete'`);
    await delay(400);
  }
  try {
    await send('Page.enable');
    await navigate('/produto/batom-matte-vermelho-classico');
    await waitFor(`document.body.innerText.includes('R$')`);
    const priceText = await evaluate(`document.querySelector('p.text-4xl').innerText`);
    const canonicalPrice = Number(priceText.replace(/[^\d,]/g, '').replace(',', '.'));
    const money = value => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }).replace(/\s/g, '');
    await evaluate(`localStorage.setItem('makes:sacola', '[{"productId":"p-01","quantity":2,"variation":"Vermelho Clássico"}]');localStorage.setItem('makes:favoritos', '["p-01"]')`);
    await navigate('/sacola');
    await waitFor(`document.body.innerText.includes('Batom Matte Vermelho Clássico')`);
    const bag = await evaluate(`({text:document.body.innerText, lines:JSON.parse(localStorage.getItem('makes:sacola'))})`);
    assert.ok(bag.text.replace(/\s/g, '').includes(money(canonicalPrice * 2)), 'Sacola: 2 × preço canônico');
    assert.equal(bag.lines[0].productId, 'p-01'); assert.equal(bag.lines[0].quantity, 2);
    console.log(`Navegador: sacola legada p-01 × 2 restaurada com total PIX ${money(canonicalPrice * 2)}.`);
    await navigate('/checkout');
    await waitFor(`document.body.innerText.includes('Batom Matte Vermelho Clássico')`);
    const checkout = await evaluate('document.body.innerText');
    assert.ok(checkout.replace(/\s/g, '').includes(money(canonicalPrice * 2)));
    console.log('Navegador: checkout recebe o mesmo produto/preço canônico, sem enviar pedido.');
    await navigate('/favoritos');
    await waitFor(`document.body.innerText.includes('Batom Matte Vermelho Clássico')`);
    assert.ok((await evaluate('document.body.innerText')).replace(/\s/g, '').includes(money(canonicalPrice)));
    assert.equal((await evaluate(`JSON.parse(localStorage.getItem('makes:favoritos'))`))[0], 'p-01');
    console.log(`Navegador: favorito legado p-01 exibe PIX ${money(canonicalPrice)}.`);
    await evaluate(`document.querySelector('button[aria-label="Buscar produtos"]').click()`);
    await waitFor(`!!document.querySelector('input[aria-label="Buscar produtos"]')`);
    await evaluate(`(() => { const input = document.querySelector('input[aria-label="Buscar produtos"]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'batom'); input.dispatchEvent(new Event('input', { bubbles:true })); })()`);
    await waitFor(`document.querySelector('[role="dialog"]')?.innerText.includes('Batom Matte Vermelho Clássico')`);
    assert.ok((await evaluate(`document.querySelector('[role="dialog"]').innerText`)).replace(/\s/g, '').includes(money(canonicalPrice)));
    await evaluate(`Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Fechar').click()`);
    console.log('Navegador: busca encontra o batom com o mesmo preço canônico.');
    for (const width of [1440, 1024, 768, 390]) {
      await send('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: false });
      assert.equal(await evaluate('document.documentElement.scrollWidth > innerWidth'), false, `overflow ${width}`);
    }
    console.log('Navegador: favoritos sem overflow horizontal em 1440/1024/768/390.');
    await evaluate(`document.querySelector('a[href="/produto/batom-matte-vermelho-classico"]').click()`);
    await waitFor(`location.pathname === '/produto/batom-matte-vermelho-classico' && !!document.querySelector('p.text-4xl')`);
    assert.equal((await evaluate(`JSON.parse(localStorage.getItem('makes:sacola'))`))[0].quantity, 2);
    console.log('Navegador: navegação cliente preserva a seleção local.');
  } finally { await send('Page.close'); ws.close(); await closeBrowser(); }
}
(process.argv.includes('--close') ? closeBrowser() : main()).catch(error => { console.error(error.message); process.exitCode = 1; });
