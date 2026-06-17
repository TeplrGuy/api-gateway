const express = require('express');
const { randomUUID } = require('crypto');

function createQueryString(query) {
  const searchParams = new URLSearchParams();
  Object.entries(query || {}).forEach(([key, value]) => {
    if (value !== undefined) {
      searchParams.set(key, value);
    }
  });
  const serialized = searchParams.toString();
  return serialized ? `?${serialized}` : '';
}

function createApp(options = {}) {
  const app = express();
  const port = options.port || process.env.PORT || 3000;
  const ordersBaseUrl =
    options.ordersBaseUrl || process.env.ORDERS_SERVICE_URL || 'http://localhost:3001';
  const inventoryBaseUrl =
    options.inventoryBaseUrl ||
    process.env.INVENTORY_SERVICE_URL ||
    'http://localhost:3002';
  const serviceTimeoutMs = Number(
    options.serviceTimeoutMs || process.env.SERVICE_TIMEOUT_MS || 3000
  );

  app.use(express.json());

  async function fetchWithTimeout(url, requestOptions = {}, timeoutMs = serviceTimeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...requestOptions, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  app.get('/health', (_req, res) => {
    res.status(200).json({
      service: 'api-gateway',
      status: 'ok',
      environment: process.env.ENVIRONMENT_NAME || 'local'
    });
  });

  app.get('/api/orders', async (req, res) => {
    const correlationId = req.header('x-correlation-id') || randomUUID();
    try {
      const queryString = createQueryString(req.query);
      const response = await fetchWithTimeout(`${ordersBaseUrl}/orders${queryString}`, {
        headers: {
          'x-correlation-id': correlationId
        }
      });
      const payload = await response.json().catch(() => ({}));
      res.setHeader('x-correlation-id', correlationId);
      return res.status(response.status).json(payload);
    } catch (error) {
      if (error && error.name === 'AbortError') {
        return res.status(504).json({ error: 'orders_timeout', correlationId });
      }
      return res.status(502).json({ error: 'orders_unavailable', correlationId });
    }
  });

  app.post('/api/orders', async (req, res) => {
    const correlationId = req.header('x-correlation-id') || randomUUID();
    try {
      const response = await fetchWithTimeout(`${ordersBaseUrl}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-correlation-id': correlationId
        },
        body: JSON.stringify(req.body || {})
      });
      const payload = await response.json().catch(() => ({}));
      res.setHeader('x-correlation-id', correlationId);
      return res.status(response.status).json(payload);
    } catch (error) {
      if (error && error.name === 'AbortError') {
        return res.status(504).json({ error: 'orders_timeout', correlationId });
      }
      return res.status(502).json({ error: 'orders_unavailable', correlationId });
    }
  });

  app.get('/api/orders/:orderId', async (req, res) => {
    const correlationId = req.header('x-correlation-id') || randomUUID();
    try {
      const response = await fetchWithTimeout(
        `${ordersBaseUrl}/orders/${req.params.orderId}`,
        {
          headers: {
            'x-correlation-id': correlationId
          }
        }
      );
      const payload = await response.json().catch(() => ({}));
      res.setHeader('x-correlation-id', correlationId);
      return res.status(response.status).json(payload);
    } catch (error) {
      if (error && error.name === 'AbortError') {
        return res.status(504).json({ error: 'orders_timeout', correlationId });
      }
      return res.status(502).json({ error: 'orders_unavailable', correlationId });
    }
  });

  app.get('/api/inventory/:sku', async (req, res) => {
    try {
      const response = await fetchWithTimeout(`${inventoryBaseUrl}/inventory/${req.params.sku}`);
      const payload = await response.json().catch(() => ({}));
      return res.status(response.status).json(payload);
    } catch (error) {
      if (error && error.name === 'AbortError') {
        return res.status(504).json({ error: 'inventory_timeout' });
      }
      return res.status(502).json({ error: 'inventory_unavailable' });
    }
  });

  return { app, createQueryString, port };
}

if (require.main === module) {
  const { app, port } = createApp();
  app.listen(port, () => {
    console.log('api-gateway listening on port ' + port);
  });
}

module.exports = {
  createApp,
  createQueryString
};
