const test = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForHealth(baseUrl, attempts = 40) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) return;
    } catch {}
    await wait(150);
  }
  throw new Error("api-gateway did not become healthy in time");
}

test("GET /api/orders returns 502 orders_unavailable when orders-service is unreachable", async () => {
  const port = String(3800 + Math.floor(Math.random() * 200));
  const baseUrl = `http://127.0.0.1:${port}`;
  const child = spawn("node", ["src/index.js"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: port,
      SERVICE_TIMEOUT_MS: "200",
      ORDERS_SERVICE_URL: "http://127.0.0.1:19999"
    },
    stdio: "ignore"
  });

  try {
    await waitForHealth(baseUrl);

    const response = await fetch(`${baseUrl}/api/orders`);
    assert.equal(response.status, 502);
    const body = await response.json();
    assert.equal(body.error, "orders_unavailable");
    assert.ok(body.correlationId, "correlationId should be present in error response");
  } finally {
    child.kill("SIGTERM");
  }
});

test("GET /api/orders forwards allowlisted query params and correlation ID", async () => {
  const port = String(4000 + Math.floor(Math.random() * 200));
  const baseUrl = `http://127.0.0.1:${port}`;
  const mockPort = String(4200 + Math.floor(Math.random() * 200));
  const mockUrl = `http://127.0.0.1:${mockPort}`;

  // Minimal mock orders-service using Node http
  const http = require("node:http");
  let capturedUrl = null;
  let capturedCorrelationId = null;

  const mock = http.createServer((req, res) => {
    capturedUrl = req.url;
    capturedCorrelationId = req.headers["x-correlation-id"] || null;
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ orders: [], total: 0 }));
  });

  await new Promise((resolve) => mock.listen(Number(mockPort), "127.0.0.1", resolve));

  const child = spawn("node", ["src/index.js"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: port,
      SERVICE_TIMEOUT_MS: "2000",
      ORDERS_SERVICE_URL: mockUrl
    },
    stdio: "ignore"
  });

  try {
    await waitForHealth(baseUrl);

    const correlationId = "test-corr-id-abc123";
    const response = await fetch(
      `${baseUrl}/api/orders?page=2&limit=5&status=new&search=alice&orderId=o-9&extra=ignored`,
      { headers: { "x-correlation-id": correlationId } }
    );

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("x-correlation-id"), correlationId);

    const body = await response.json();
    assert.deepEqual(body, { orders: [], total: 0 });

    assert.ok(capturedUrl, "mock should have received a request");
    const parsedUrl = new URL(capturedUrl, mockUrl);
    assert.equal(parsedUrl.pathname, "/orders");
    assert.equal(parsedUrl.searchParams.get("page"), "2");
    assert.equal(parsedUrl.searchParams.get("limit"), "5");
    assert.equal(parsedUrl.searchParams.get("status"), "new");
    assert.equal(parsedUrl.searchParams.get("search"), "alice");
    assert.equal(parsedUrl.searchParams.get("orderId"), "o-9");
    assert.equal(parsedUrl.searchParams.get("extra"), null, "non-allowlisted params must not be forwarded");

    assert.equal(capturedCorrelationId, correlationId, "correlation ID must be forwarded to downstream");
  } finally {
    child.kill("SIGTERM");
    await new Promise((resolve) => mock.close(resolve));
  }
});
