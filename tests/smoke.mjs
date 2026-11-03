// Headless-Chrome smoke test for brick-calculator-bd (raw CDP, file://).
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const CHROME = '/opt/meta-chromium/chrome';
const PAGE = 'file:///home/hatch/workspace/muse-project-factory/builds/brick-calculator-bd/index.html';
const PORT = 9225;
const policyPath = '/var/lib/hatch-browser/rootfs-base/usr/share/hatch/chromium/webgl-allowed-domains.txt';
const policySha = createHash('sha256').update(readFileSync(policyPath)).digest('hex');
const chrome = spawn(CHROME, [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
  '--disable-extensions', '--no-first-run',
  `--remote-debugging-port=${PORT}`, '--user-data-dir=/tmp/brick-chrome-profile',
  `--hatch-webgl-allowed-domains-file=${policyPath}`,
  `--hatch-webgl-allowed-domains-sha256=${policySha}`,
  'about:blank',
], { stdio: 'ignore' });

const errors = [];
let ws, nextId = 1;
const pending = new Map();
function send(method, params = {}) {
  const id = nextId++;
  return new Promise((resolve) => {
    pending.set(id, resolve);
    ws.send(JSON.stringify({ id, method, params }));
  });
}
async function ev(expr) {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
  if (r.result?.exceptionDetails) throw new Error('evaluate failed: ' + expr + ' :: ' + JSON.stringify(r.result.exceptionDetails).slice(0, 300));
  return r.result.result.value;
}
let passed = 0, failed = 0;
function check(name, cond, extra = '') {
  if (cond) { passed++; console.log('PASS \u2014 ' + name); }
  else { failed++; console.log('FAIL \u2014 ' + name + ' ' + extra); }
}
async function setVal(id, v) {
  await ev(`(function(){var el=document.getElementById('${id}');el.focus();el.value='${v}';el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));})()`);
}
async function setWallLen(v) {
  await ev(`(function(){var el=document.querySelector('.w-len');el.focus();el.value='${v}';el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));})()`);
}
try {
  let wsUrl = null;
  for (let i = 0; i < 60 && !wsUrl; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      if (r.ok) {
        const list = await r.json();
        const page = list.find((t) => t.type === 'page');
        if (page && page.webSocketDebuggerUrl) wsUrl = page.webSocketDebuggerUrl;
      }
    } catch {}
    if (!wsUrl) await sleep(500);
  }
  if (!wsUrl) throw new Error('chrome debugging endpoint did not come up');
  ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); }
    if (d.method === 'Runtime.exceptionThrown') errors.push('exception: ' + JSON.stringify(d.params.exceptionDetails).slice(0, 200));
    if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') errors.push('console.error: ' + JSON.stringify(d.params.args).slice(0, 200));
  };
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Page.navigate', { url: PAGE });
  await sleep(1500);
  await ev(`localStorage.clear()`);
  await send('Page.reload', { ignoreCache: true });
  await sleep(1500);

  check('title renders', (await ev(`document.title`)).includes('Brick Calculator BD'));
  check('empty saved message', (await ev(`document.getElementById('saved-empty').textContent`)).includes('No saved estimates'));

  // Default wall 10x10, 5in, 5% wastage -> 485 bricks, net 100.00.
  await ev(`document.getElementById('btn-calc').click()`);
  await sleep(300);
  check('default calc 485 bricks', (await ev(`document.getElementById('res-bricks').textContent`)).includes('485'), await ev(`document.getElementById('res-bricks').textContent`));
  check('net area 100.00', (await ev(`document.getElementById('res-net').textContent`)).includes('100.00'));
  check('cement 3 bags', (await ev(`document.getElementById('res-cement').textContent`)).includes('3'), await ev(`document.getElementById('res-cement').textContent`));
  check('cost hint without prices', (await ev(`document.getElementById('cost-box').textContent`)).includes('Enter prices'));

  // Cost: brick 12, cement 550, sand 60 -> total includes 5,820 + 1,650.
  await setVal('price-brick', '12');
  await setVal('price-cement', '550');
  await setVal('price-sand', '60');
  await ev(`document.getElementById('btn-calc').click()`);
  await sleep(300);
  const costText = await ev(`document.getElementById('cost-box').textContent`);
  check('cost total renders', costText.includes('5,820.00') && costText.includes('1,650.00'), costText);

  // Save + reload persistence.
  await ev(`document.getElementById('btn-save').click()`);
  await sleep(300);
  check('saved message shown', !(await ev(`document.getElementById('save-msg').hidden`)));
  await send('Page.reload', { ignoreCache: true });
  await sleep(1500);
  check('saved estimate persists after reload', (await ev(`document.querySelectorAll('#saved-list li').length`)) === 1);

  // Validation: wall length 0 -> error.
  await setWallLen('0');
  await ev(`document.getElementById('btn-calc').click()`);
  await sleep(300);
  check('zero length shows error', !(await ev(`document.getElementById('calc-error').hidden`)));
  await setWallLen('10');

  // BN toggle: title changes + bricks in Bengali digits.
  await ev(`document.getElementById('btn-calc').click()`);
  await sleep(300);
  await ev(`document.getElementById('lang-toggle').click()`);
  await sleep(300);
  const bnTitle = await ev(`document.getElementById('app-title').textContent`);
  const bnBricks = await ev(`document.getElementById('res-bricks').textContent`);
  check('BN toggle changes title', bnTitle !== 'Brick Calculator BD' && bnTitle.length > 0, bnTitle);
  check('BN bricks use Bengali digits', /[\u09e6-\u09ef]/.test(bnBricks), bnBricks);
  check('BN persists after reload', (await (async () => {
    await send('Page.reload', { ignoreCache: true });
    await sleep(1500);
    return (await ev(`document.getElementById('app-title').textContent`)) !== 'Brick Calculator BD';
  })()));

  // Back to EN, add a second 10x10 wall -> 200 sq ft -> 970 bricks.
  await ev(`document.getElementById('lang-toggle').click()`);
  await sleep(300);
  await ev(`document.getElementById('btn-add-wall').click()`);
  await sleep(200);
  check('two wall rows after add', (await ev(`document.querySelectorAll('.wall-row').length`)) === 2);
  await ev(`document.getElementById('btn-calc').click()`);
  await sleep(300);
  check('two walls -> 970 bricks', (await ev(`document.getElementById('res-bricks').textContent`)).includes('970'), await ev(`document.getElementById('res-bricks').textContent`));

  // Mobile 390px no horizontal overflow.
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await sleep(500);
  const overflow = await ev(`document.documentElement.scrollWidth > 390`);
  check('390px no horizontal overflow', !overflow, 'scrollWidth=' + (await ev(`document.documentElement.scrollWidth`)));
  await send('Emulation.clearDeviceMetricsOverride');

  check('zero console/page errors', errors.length === 0, errors.join(' | ').slice(0, 300));
} catch (e) {
  console.log('HARNESS ERROR \u2014 ' + e.message);
  failed++;
} finally {
  try { ws && ws.close(); } catch {}
  chrome.kill();
  console.log(`SMOKE: ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}
