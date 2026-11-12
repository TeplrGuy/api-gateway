const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { once } = require('node:events');
const { resolve } = require('node:path');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');

async function listen(server, t) {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => {
    server.close(resolve);
    server.closeAllConnections();
  }));
  return `http://127.0.0.1:${server.address().port}`;
}

test('real gateway -> real orders provider -> pinned OrderListResponse contract', async t => {
  const dependencies = http.createServer((req, res) => {
    assert.ok(['/inventory/reserve', '/notifications/order-created'].includes(req.url));
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      res.setHeader('content-type', 'application/json');
      res.statusCode = JSON.parse(body).sku === 'Out-Of-Stock' ? 409 : 200;
      res.end('{}');
    });
  });
  const dependenciesUrl = await listen(dependencies, t);
  process.env.INVENTORY_SERVICE_URL = dependenciesUrl;
  process.env.NOTIFICATIONS_SERVICE_URL = dependenciesUrl;
  process.env.SERVICE_TIMEOUT_MS = '1000';

  const ordersPath = resolve(process.env.ORDERS_SERVICE_PATH || '../orders-service');
  const contractsPath = resolve(process.env.CONTRACTS_PATH || '../shared-contracts');
  const orders = require(resolve(ordersPath, 'src/index.js'));
  const ordersUrl = await listen(http.createServer(orders), t);
  process.env.ORDERS_SERVICE_URL = ordersUrl;
  const gateway = require('../../src/index');
  const base = await listen(http.createServer(gateway), t);
  const { loadValidator } = require(resolve(contractsPath, 'scripts/validate.js'));
  const validate = loadValidator().getSchema(
    'https://github.com/TeplrGuy/shared-contracts/contracts/responses/order-list-response.v1.schema.json'
  );
  const get = async query => {
    const response = await fetch(`${base}/api/orders${query}`, {
      headers: { 'x-correlation-id': 'cross-repo-demo' }
    });
    assert.equal(response.headers.get('x-correlation-id'), 'cross-repo-demo');
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(validate(body), true, JSON.stringify(validate.errors));
    return body;
  };
  assert.equal((await get('')).orders.length, 0);
  for (const order of [
    { orderId: 'demo-a', customerId: 'Acme', sku: 'Widget-Blue', quantity: 1 },
    { orderId: 'demo-b', customerId: 'Contoso', sku: 'Gear', quantity: 2 }
  ]) {
    const created = await fetch(`${base}/api/orders`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-correlation-id': 'cross-repo-demo' },
      body: JSON.stringify(order)
    });
    assert.equal(created.status, 201);
    const body = await created.json();
    assert.equal(body.order.status, 'created');
    assert.equal(body.order.correlationId, 'cross-repo-demo');
  }
  const filtered = await get('?page=1&limit=1&status=NEW_ORDER&search=wIDGet&orderId=DEMO-A');
  assert.equal(filtered.orders[0].orderId, 'demo-a');
  assert.equal(filtered.orders[0].customerName, 'Acme');
  assert.equal(filtered.orders[0].status, 'new_order');
  assert.deepEqual(filtered.pagination, { page: 1, limit: 1, total: 1, totalPages: 1 });
  const { stdout } = await promisify(execFile)('curl', [
    '--fail-with-body', '--silent', '--show-error', '--max-time', '10',
    '--header', 'x-correlation-id: cross-repo-demo',
    `${base}/api/orders?page=1&limit=1&status=NEW_ORDER&search=wIDGet&orderId=DEMO-A`
  ]);
  assert.deepEqual(JSON.parse(stdout), filtered);
  console.log(`curl GET /api/orders?page=1&limit=1&status=NEW_ORDER&search=wIDGet&orderId=DEMO-A -> ${stdout}`);
  assert.equal((await get('?search=CONTOSO')).orders[0].orderId, 'demo-b');
  const first = await get('?page=1&limit=1');
  const second = await get('?page=2&limit=1');
  assert.notEqual(first.orders[0].orderId, second.orders[0].orderId);
  assert.equal(second.pagination.totalPages, 2);
  assert.equal((await get('?page=3&limit=1')).orders.length, 0);
  assert.equal((await get('?status=shipped')).orders.length, 0);
  for (const query of ['?page=0', '?limit=101', '?status=pending', '?page=1&page=2', '?search[nested]=x']) {
    const response = await fetch(`${base}/api/orders${query}`);
    assert.equal(response.status, 400, query);
    assert.equal((await response.json()).error, 'invalid_query');
  }
  const tracked = await fetch(`${base}/api/orders/demo-a`);
  assert.equal(tracked.status, 200);
  assert.equal((await tracked.json()).order.status, 'created');
  const missing = await fetch(`${base}/api/orders/missing`);
  assert.equal(missing.status, 404);
  const duplicate = await fetch(`${base}/api/orders`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ orderId: 'demo-a', customerId: 'Acme', sku: 'Widget-Blue', quantity: 1 })
  });
  assert.equal(duplicate.status, 409);
  const rejected = await fetch(`${base}/api/orders`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ orderId: 'demo-rejected', customerId: 'Acme', sku: 'Out-Of-Stock', quantity: 1 })
  });
  assert.equal(rejected.status, 409);
  assert.equal((await rejected.json()).order.status, 'rejected_inventory');
  const failures = await get('?status=REJECTED');
  assert.equal(failures.orders.length, 1);
  assert.equal(failures.orders[0].orderId, 'demo-rejected');
});
