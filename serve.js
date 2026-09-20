// Static server for the two windows. getUserMedia needs a secure context and http://localhost is
// one, which is why the app is never opened as file:// (system design §12).
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
};

export function createStaticServer(root = fileURLToPath(new URL('.', import.meta.url))) {
  const base = resolve(root);
  return createServer(async (req, res) => {
    let path;
    try {
      path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    } catch {
      res.writeHead(400).end();
      return;
    }
    const relative = path === '/' ? 'index.html' : path.slice(1);
    const file = resolve(base, relative);
    // Nothing outside the project, and no dotfiles: .git and .superpowers stay private.
    const hidden = relative.split('/').some((part) => part.startsWith('.'));
    if (hidden || !file.startsWith(base + sep)) {
      res.writeHead(404).end();
      return;
    }
    try {
      const body = await readFile(file);
      res.writeHead(200, {
        'content-type': TYPES[extname(file)] ?? 'application/octet-stream',
        'cache-control': 'no-store',
      });
      res.end(body);
    } catch {
      res.writeHead(404).end();
    }
  });
}

if (import.meta.main) {
  const port = Number(process.env.PORT ?? 8080);
  createStaticServer().listen(port, '127.0.0.1', () => {
    console.log(`Operator  http://localhost:${port}/   (mock mat: http://localhost:${port}/?driver=mock)`);
    console.log(`Audience  http://localhost:${port}/audience.html`);
  });
}
