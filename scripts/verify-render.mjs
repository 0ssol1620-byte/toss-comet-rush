import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const outDir = join(root, 'artifacts', 'render-audit');
const chromeCandidates = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
];
const chromePath = chromeCandidates.find(existsSync);
const failures = [];

function assert(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}

function delay(ms) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
}

async function waitForJson(url, timeoutMs = 8000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return response.json();
      }
    } catch (error) {
      lastError = error;
    }

    await delay(100);
  }

  throw lastError ?? new Error(`Timed out waiting for ${url}`);
}

function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let seq = 0;
  const pending = new Map();
  const listeners = new Map();

  ws.addEventListener('message', (event) => {
    const payload = JSON.parse(event.data);

    if (payload.id != null) {
      const waiter = pending.get(payload.id);
      if (waiter == null) {
        return;
      }

      pending.delete(payload.id);
      if (payload.error != null) {
        waiter.reject(new Error(payload.error.message));
      } else {
        waiter.resolve(payload.result);
      }
      return;
    }

    const callbacks = listeners.get(payload.method) ?? [];
    for (const callback of callbacks) {
      callback(payload.params);
    }
  });

  return new Promise((resolveConnect, rejectConnect) => {
    ws.addEventListener('open', () => {
      resolveConnect({
        close: () => ws.close(),
        on(method, callback) {
          const callbacks = listeners.get(method) ?? [];
          callbacks.push(callback);
          listeners.set(method, callbacks);
        },
        send(method, params = {}) {
          return new Promise((resolveSend, rejectSend) => {
            const id = ++seq;
            pending.set(id, { resolve: resolveSend, reject: rejectSend });
            ws.send(JSON.stringify({ id, method, params }));
          });
        },
      });
    }, { once: true });
    ws.addEventListener('error', rejectConnect, { once: true });
  });
}

async function waitReady(cdp, label) {
  const deadline = Date.now() + 7000;
  let lastValue = null;

  while (Date.now() < deadline) {
    const result = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const root = document.querySelector('.game-root');
        const canvas = document.querySelector('canvas');
        const rect = canvas?.getBoundingClientRect();
        return {
          href: location.href,
          title: document.title,
          body: document.body?.innerHTML?.slice(0, 120) ?? null,
          ready: root?.dataset?.cometReady ?? null,
          canvas: rect == null ? null : {
            width: rect.width,
            height: rect.height,
            left: rect.left,
            top: rect.top
          }
        };
      })()`,
      returnByValue: true,
    });
    const value = result.result.value;
    lastValue = value;

    if (value?.ready === 'ready' && value.canvas?.width > 0 && value.canvas?.height > 0) {
      return value;
    }

    await delay(120);
  }

  throw new Error(`${label} did not reach ready state: ${JSON.stringify(lastValue)}`);
}

async function captureCase({ screen, stress = false, viewport }) {
  const profile = await mkdtemp(join(tmpdir(), `comet-render-${screen}-`));
  const port = 9410 + Math.floor(Math.random() * 500);
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--disable-gpu',
    '--disable-background-networking',
    '--disable-extensions',
    '--no-first-run',
    '--no-default-browser-check',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    `--window-size=${viewport.width},${viewport.height}`,
    'about:blank',
  ], { stdio: 'ignore' });

  try {
    const tabs = await waitForJson(`http://127.0.0.1:${port}/json/list`);
    const target = tabs.find((tab) => tab.type === 'page') ?? tabs[0];
    const cdp = await connect(target.webSocketDebuggerUrl);
    const runtimeErrors = [];

    cdp.on('Runtime.exceptionThrown', (params) => {
      runtimeErrors.push(params.exceptionDetails?.text ?? 'runtime exception');
    });
    cdp.on('Log.entryAdded', (params) => {
      if (params.entry?.level === 'error') {
        runtimeErrors.push(params.entry.text);
      }
    });

    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Log.enable');
    await cdp.send('Page.bringToFront').catch(() => undefined);
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: viewport.dpr ?? 1,
      mobile: viewport.mobile ?? true,
      screenWidth: viewport.width,
      screenHeight: viewport.height,
    });

    const query = new URLSearchParams({ screen });
    if (stress) {
      query.set('stress', '1');
    }

    const fileUrl = `${pathToFileURL(join(root, 'play-direct.html')).href}?${query.toString()}`;
    await cdp.send('Page.navigate', { url: fileUrl });
    const state = await waitReady(cdp, `${viewport.name}:${screen}`);
    await delay(450);

    const screenshot = await cdp.send('Page.captureScreenshot', {
      captureBeyondViewport: false,
      format: 'png',
      fromSurface: true,
    });
    const bytes = Buffer.from(screenshot.data, 'base64');
    const name = `${viewport.name}-${screen}${stress ? '-stress' : ''}.png`;
    await writeFile(join(outDir, name), bytes);
    await writeFile(join(outDir, name.replace(/\.png$/, '.json')), `${JSON.stringify(state, null, 2)}\n`);

    assert(bytes.length > 24000, `${viewport.name}:${screen} screenshot is suspiciously small`);
    assert(runtimeErrors.length === 0, `${viewport.name}:${screen} runtime errors: ${runtimeErrors.join(' | ')}`);
    cdp.close();
  } finally {
    chrome.kill();
    await new Promise((resolveExit) => {
      const timer = setTimeout(resolveExit, 1200);
      chrome.once('exit', () => {
        clearTimeout(timer);
        resolveExit();
      });
    });
    await rm(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 250 }).catch(() => undefined);
  }
}

if (chromePath == null) {
  console.warn('Render verification skipped: Chrome or Edge executable was not found.');
  process.exit(0);
}

await mkdir(outDir, { recursive: true });

const viewports = [
  { name: 'mobile320', width: 320, height: 568, mobile: true },
  { name: 'mobile390', width: 390, height: 844, mobile: true },
  { name: 'mobile430', width: 430, height: 932, mobile: true },
  { name: 'desktop1440', width: 1440, height: 900, mobile: false },
];

const screens = ['menu', 'growth', 'tutorial', 'onboarding', 'playing', 'pause', 'upgrade', 'gameover'];

for (const viewport of viewports) {
  for (const screen of screens) {
    await captureCase({ screen, viewport });
  }
}

await captureCase({ screen: 'gameover', stress: true, viewport: viewports[1] });
await writeFile(join(outDir, 'manifest.json'), `${JSON.stringify({ generatedAt: new Date().toISOString(), viewports, screens }, null, 2)}\n`);

if (failures.length > 0) {
  console.error(`Render verification failed with ${failures.length} issue(s):`);
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Render verification passed. Screenshots written to ${resolve(outDir)}`);
