// Shared by the browser scripts in this folder: serves the app, drives headless Chrome over the
// DevTools protocol, and counts checks. No dependencies beyond Chrome and Node 24.
// CHROME=/path/to/chrome overrides the binary.
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStaticServer } from '../../serve.js';

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// A fixed sleep either flakes or wastes time, because how long a window takes to be ready depends
// on the machine. Poll instead: return as soon as it is true, fail loudly if it never is.
export const waitFor = async (predicate, { timeout = 10000, every = 100, what = 'condition' } = {}) => {
  const deadline = Date.now() + timeout;
  for (;;) {
    if (await predicate()) return true;
    if (Date.now() > deadline) throw new Error(`waitFor timed out after ${timeout} ms: ${what}`);
    await sleep(every);
  }
};

export async function startHarness(debugPort) {
  const server = createStaticServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const profile = mkdtempSync(join(tmpdir(), 'ctd-chrome-'));
  // Without a GPU, WebGL (the maze) needs Chrome's software renderer, SwiftShader.
  const chrome = spawn(process.env.CHROME ?? 'google-chrome', [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--enable-unsafe-swiftshader',
    `--remote-debugging-port=${debugPort}`, `--user-data-dir=${profile}`, 'about:blank',
  ], { stdio: 'ignore' });
  process.on('exit', () => chrome.kill()); // also when a check throws

  for (let i = 0; i < 50; i += 1) {
    try {
      await fetch(`http://127.0.0.1:${debugPort}/json/version`);
      break;
    } catch {
      await sleep(200);
    }
  }

  let failures = 0;
  return {
    base: `http://localhost:${server.address().port}`,
    openTab: (url) => openTab(debugPort, url),
    check(label, ok, detail = '') {
      if (!ok) failures += 1;
      console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `  (${detail})` : ''}`);
    },
    // Prints the summary, stops Chrome and the server, and exits 0 only if every check passed.
    async finish(name) {
      console.log(failures === 0 ? `\n${name}: all checks passed` : `\n${name}: ${failures} failed`);
      server.close();
      chrome.kill();
      await once(chrome, 'exit');
      rmSync(profile, { recursive: true, force: true });
      process.exit(failures === 0 ? 0 : 1);
    },
  };
}

const KEYS = {
  ' ': ['Space', 32], n: ['KeyN', 78], d: ['KeyD', 68], u: ['KeyU', 85], r: ['KeyR', 82],
  s: ['KeyS', 83], Escape: ['Escape', 27], Enter: ['Enter', 13],
};

async function openTab(debugPort, url) {
  const target = await (await fetch(`http://127.0.0.1:${debugPort}/json/new?${url}`, { method: 'PUT' })).json();
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve) => socket.addEventListener('open', resolve, { once: true }));
  let lastId = 0;
  const waiting = new Map();
  const errors = [];
  socket.addEventListener('message', (e) => {
    const message = JSON.parse(e.data);
    waiting.get(message.id)?.(message);
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.exception?.description);
  });
  const send = (method, params = {}) => new Promise((resolve) => {
    lastId += 1;
    waiting.set(lastId, resolve);
    socket.send(JSON.stringify({ id: lastId, method, params }));
  });
  await send('Runtime.enable');
  return {
    send,
    errors,
    close: () => socket.close(),
    closeTab: () => fetch(`http://127.0.0.1:${debugPort}/json/close/${target.id}`),
    evaluate: async (expression) =>
      (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result?.result?.value,
    async press(key) {
      const [code, keyCode] = KEYS[key];
      // `text` is the character the key types, so only a printable key has one. Sending "Escape"
      // as text makes Chrome drop the keydown entirely, and the page never hears the key.
      const text = key.length === 1 ? { text: key } : {};
      await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, ...text, windowsVirtualKeyCode: keyCode });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: keyCode });
    },
    // The viewport as a PNG.
    async screenshot() {
      return Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).result.data, 'base64');
    },
  };
}
