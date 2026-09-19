import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { request } from 'node:http';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStaticServer } from '../serve.js';

let server;
let port;

before(async () => {
  const root = mkdtempSync(join(tmpdir(), 'ctd-serve-'));
  writeFileSync(join(root, 'index.html'), '<p>operator</p>');
  writeFileSync(join(root, 'app.js'), 'export {};');
  writeFileSync(join(root, '.secret'), 'hidden');
  mkdirSync(join(root, 'sub'));
  server = createStaticServer(root);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  port = server.address().port;
});

after(() => server.close());

// http.request sends the path as written; fetch would normalise the traversal attempts away.
function get(path) {
  return new Promise((resolve, reject) => {
    request({ host: '127.0.0.1', port, path }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, type: res.headers['content-type'], body }));
    }).on('error', reject).end();
  });
}

test('serves index.html at the root', async () => {
  const res = await get('/');
  assert.equal(res.status, 200);
  assert.equal(res.type, 'text/html; charset=utf-8');
  assert.equal(res.body, '<p>operator</p>');
});

test('serves JavaScript with a JavaScript type, so modules and workers load', async () => {
  const res = await get('/app.js');
  assert.equal(res.status, 200);
  assert.equal(res.type, 'text/javascript; charset=utf-8');
});

test('refuses paths that climb out of the root', async () => {
  assert.equal((await get('/..%2f..%2fetc%2fpasswd')).status, 404);
  assert.equal((await get('/sub/..%2f..%2fapp.js')).status, 404);
});

test('refuses dotfiles', async () => {
  assert.equal((await get('/.secret')).status, 404);
});

test('answers 404 for missing files and directories', async () => {
  assert.equal((await get('/missing.js')).status, 404);
  assert.equal((await get('/sub')).status, 404);
});

test('answers 400 for a malformed path', async () => {
  assert.equal((await get('/%E0%A4%A')).status, 400);
});
