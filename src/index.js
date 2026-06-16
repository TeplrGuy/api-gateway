const express = require('express');

const app = express();
const port = process.env.PORT || 3000;
const ordersBaseUrl = process.env.ORDERS_SERVICE_URL || 'http://localhost:3001';
const inventoryBaseUrl = process.env.INVENTORY_SERVICE_URL || 'http://localhost:3002';
const serviceTimeoutMs = Number(process.env.SERVICE_TIMEOUT_MS || 3000);

app.use(express.json());

async function fetchWithTimeout(url, options = {}, timeoutMs = serviceTimeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
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

app.post('/api/orders', async (req, res) => {
  try {
    const response = await fetchWithTimeout(`${ordersBaseUrl}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body || {})
    });
    const payload = await response.json().catch(() => ({}));
    return res.status(response.status).json(payload);
  } catch (error) {
    if (error && error.name === 'AbortError') {
      return res.status(504).json({ error: 'orders_timeout' });
    }
    return res.status(502).json({ error: 'orders_unavailable' });
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

app.listen(port, () => {
  console.log('api-gateway listening on port ' + port);
});
