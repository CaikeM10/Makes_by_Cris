const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function openEdge() {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'makes-admin-home-'));
  const browser = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', [
    '--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank',
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
    let next = 0; const pending = new Map(); const exceptions = [];
    ws.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      if (pending.has(message.id)) {
        const { resolve, reject, timer } = pending.get(message.id); clearTimeout(timer); pending.delete(message.id);
        message.error ? reject(Error(JSON.stringify(message.error))) : resolve(message.result);
      }
      if (message.method === 'Runtime.exceptionThrown') exceptions.push(message.params.exceptionDetails.text);
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
    await send('Page.enable'); await send('Runtime.enable');
    return { send, evaluate, exceptions, sleep, async close() { try { await send('Browser.close'); } catch {} ws.close(); browser.kill(); } };
  } catch (error) { if (ws) ws.close(); browser.kill(); throw error; }
}
module.exports = { openEdge };
