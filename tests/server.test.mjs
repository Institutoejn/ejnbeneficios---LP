import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../scripts/server.mjs';

test('LP pública serve a página e todos os recursos locais sem autenticação', async () => {
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const response = await fetch(base);
    assert.equal(response.status, 200);
    assert.equal(response.headers.has('set-cookie'), false);
    const html = await response.text();
    for (const match of html.matchAll(/(?:src|href)="\.\/([^"#]+)"/g)) {
      const resource = await fetch(`${base}/${match[1]}`);
      assert.equal(resource.status, 200, match[1]);
    }
    for (const path of ['/.git/config', '/package.json', '/scripts/server.mjs', '/assets/%2e%2e%2f.git/config', '/missing']) {
      assert.equal((await fetch(base + path)).status, 404, path);
    }
    assert.equal((await fetch(base, { method: 'POST' })).status, 405);
    assert.equal((await fetch(base, { method: 'HEAD' })).status, 200);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
