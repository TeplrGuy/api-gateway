const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { once } = require('node:events');

async function listen(server, t) {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => !server.listening ? undefined : new Promise(resolve => {
    server.close(resolve);
    server.closeAllConnections();
  }));
  return `http://127.0.0.1:${server.address().port}`;
}

test('list proxy preserves query/status/correlation and reports transport/body failures', async t => {
  let observed;
  const upstream = http.createServer((req, res) => {
    observed = { url: req.url, correlationId: req.headers['x-correlation-id'] };
    const mode = new URL(req.url, 'http://upstream.local').searchParams.get('mode');
    res.setHeader('content-type', 'application/json');
    if (mode === 'timeout') return;
    if (mode === 'body-timeout') {
      res.writeHead(200);
      res.write('{"orders":[');
      return;
    }
    if (mode === 'invalid-json') return res.end('not json');
    res.statusCode = mode === 'invalid-query' ? 400 : 200;
    res.end(JSON.stringify(mode === 'invalid-query' ? { error: 'invalid_query' } : { orders: [] }));
  });
  const upstreamUrl = await listen(upstream, t);
  process.env.ORDERS_SERVICE_URL = upstreamUrl;
  process.env.SERVICE_TIMEOUT_MS = '300';
  const app = require('../../src/index');
  const base = await listen(http.createServer(app), t);

  const query = '?page=2&limit=5&status=NEW_ORDER&search=blue%20widget&orderId=AB';
  const response = await fetch(`${base}/api/orders${query}`, { headers: { 'x-correlation-id': 'demo-trace' } });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { orders: [] });
  assert.deepEqual(observed, { url: `/orders${query}`, correlationId: 'demo-trace' });
  assert.equal(response.headers.get('x-correlation-id'), 'demo-trace');

  const generated = await fetch(`${base}/api/orders`);
  assert.match(generated.headers.get('x-correlation-id'), /^[a-f0-9-]{36}$/);
  assert.equal(observed.correlationId, generated.headers.get('x-correlation-id'));
  await generated.json();

  const invalid = await fetch(`${base}/api/orders?mode=invalid-query`);
  assert.equal(invalid.status, 400);
  assert.deepEqual(await invalid.json(), { error: 'invalid_query' });
  for (const mode of ['timeout', 'body-timeout', 'invalid-json']) {
    const result = await fetch(`${base}/api/orders?mode=${mode}`);
    assert.equal(result.status, mode === 'invalid-json' ? 502 : 504);
    const body = await result.json();
    assert.equal(body.error, mode === 'invalid-json' ? 'orders_unavailable' : 'orders_timeout');
    assert.equal(body.correlationId, result.headers.get('x-correlation-id'));
  }
  await new Promise(resolve => {
    upstream.close(resolve);
    upstream.closeAllConnections();
  });
  const unavailable = await fetch(`${base}/api/orders`);
  assert.equal(unavailable.status, 502);
  assert.equal((await unavailable.json()).error, 'orders_unavailable');
});
