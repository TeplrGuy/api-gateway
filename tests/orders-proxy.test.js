const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');

const { createApp } = require('../src/index');

async function startHttpServer(handler) {
  const server = http.createServer(handler);
  await new Promise(resolve => server.listen(0, resolve));
  const address = server.address();

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    async close() {
      await new Promise((resolve, reject) => {
        server.close(error => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    }
  };
}

async function startGateway(overrides) {
  const { app } = createApp(overrides);
  const server = await new Promise(resolve => {
    const listener = app.listen(0, () => resolve(listener));
  });
  const address = server.address();

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    async close() {
      await new Promise((resolve, reject) => {
        server.close(error => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    }
  };
}

test('GET /api/orders forwards query params and correlation ids', async () => {
  let receivedUrl = null;
  let receivedCorrelationId = null;
  const downstream = await startHttpServer((req, res) => {
    receivedUrl = req.url;
    receivedCorrelationId = req.headers['x-correlation-id'];
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        orders: [{ orderId: 'ORD-1', orderNumber: 'ORD-1', status: 'new_order' }],
        pagination: { page: 2, limit: 5, total: 1, totalPages: 1 }
      })
    );
  });
  const gateway = await startGateway({ ordersBaseUrl: downstream.baseUrl });

  try {
    const response = await fetch(
      `${gateway.baseUrl}/api/orders?page=2&limit=5&status=new_order&search=alice&orderId=ORD`,
      {
        headers: {
          'x-correlation-id': 'corr-list-123'
        }
      }
    );
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.equal(receivedUrl, '/orders?page=2&limit=5&status=new_order&search=alice&orderId=ORD');
    assert.equal(receivedCorrelationId, 'corr-list-123');
    assert.equal(payload.pagination.page, 2);
    assert.equal(response.headers.get('x-correlation-id'), 'corr-list-123');
  } finally {
    await gateway.close();
    await downstream.close();
  }
});

test('GET /api/orders returns structured 502 when downstream is unavailable', async () => {
  const gateway = await startGateway({ ordersBaseUrl: 'http://127.0.0.1:65530' });

  try {
    const response = await fetch(`${gateway.baseUrl}/api/orders`);
    const payload = await response.json();

    assert.equal(response.status, 502);
    assert.equal(payload.error, 'orders_unavailable');
    assert.ok(payload.correlationId);
  } finally {
    await gateway.close();
  }
});

test('GET /api/orders/:orderId continues to work after list route is added', async () => {
  const downstream = await startHttpServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ order: { orderId: 'ORD-42' } }));
  });
  const gateway = await startGateway({ ordersBaseUrl: downstream.baseUrl });

  try {
    const response = await fetch(`${gateway.baseUrl}/api/orders/ORD-42`);
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.equal(payload.order.orderId, 'ORD-42');
  } finally {
    await gateway.close();
    await downstream.close();
  }
});
