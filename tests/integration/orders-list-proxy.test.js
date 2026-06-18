const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { spawn } = require("node:child_process");

function randomPort(base) {
  return String(base + Math.floor(Math.random() * 200));
}

function waitForGatewayReady(child, port) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("api-gateway did not become healthy in time"));
    }, 5000);

    function cleanup() {
      clearTimeout(timeout);
      child.stdout.off("data", onData);
      child.stderr.off("data", onData);
      child.off("exit", onExit);
    }

    function onData(chunk) {
      if (String(chunk).includes(`api-gateway listening on port ${port}`)) {
        cleanup();
        resolve();
      }
    }

    function onExit(code) {
      cleanup();
      reject(new Error(`api-gateway exited before startup (code: ${code})`));
    }

    child.stdout.on("data", onData);
    child.stderr.on("data", onData);
    child.on("exit", onExit);
  });
}

test("GET /api/orders proxies list requests and forwards whitelisted query params", async () => {
  const downstreamPort = randomPort(3900);
  const gatewayPort = randomPort(4200);
  const gatewayBaseUrl = `http://127.0.0.1:${gatewayPort}`;

  let capturedUrl = null;
  let capturedCorrelationId = null;

  const downstreamServer = http.createServer((req, res) => {
    capturedUrl = req.url;
    capturedCorrelationId = req.headers["x-correlation-id"];
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ items: [{ orderId: "o-1" }], total: 1 }));
  });
  await new Promise((resolve) => downstreamServer.listen(Number(downstreamPort), "127.0.0.1", resolve));

  const gateway = spawn("node", ["src/index.js"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: gatewayPort,
      ORDERS_SERVICE_URL: `http://127.0.0.1:${downstreamPort}`,
      SERVICE_TIMEOUT_MS: "2000"
    },
    stdio: ["ignore", "pipe", "pipe"]
  });

  try {
    await waitForGatewayReady(gateway, gatewayPort);

    const response = await fetch(
      `${gatewayBaseUrl}/api/orders?page=2&limit=25&status=shipped&search=alice&orderId=ord-7&ignored=value`,
      {
        headers: { "x-correlation-id": "cid-orders-list-1" }
      }
    );

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("x-correlation-id"), "cid-orders-list-1");
    const payload = await response.json();
    assert.deepEqual(payload, { items: [{ orderId: "o-1" }], total: 1 });

    assert.equal(capturedCorrelationId, "cid-orders-list-1");
    assert.ok(capturedUrl);
    const downstreamUrl = new URL(capturedUrl, "http://127.0.0.1");
    assert.equal(downstreamUrl.pathname, "/orders");
    assert.equal(downstreamUrl.searchParams.get("page"), "2");
    assert.equal(downstreamUrl.searchParams.get("limit"), "25");
    assert.equal(downstreamUrl.searchParams.get("status"), "shipped");
    assert.equal(downstreamUrl.searchParams.get("search"), "alice");
    assert.equal(downstreamUrl.searchParams.get("orderId"), "ord-7");
    assert.equal(downstreamUrl.searchParams.get("ignored"), null);
  } finally {
    gateway.kill("SIGTERM");
    await new Promise((resolve) => downstreamServer.close(resolve));
  }
});

test("GET /api/orders returns structured 502 when orders service is unavailable", async () => {
  const gatewayPort = randomPort(4400);
  const gatewayBaseUrl = `http://127.0.0.1:${gatewayPort}`;
  const gateway = spawn("node", ["src/index.js"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: gatewayPort,
      ORDERS_SERVICE_URL: "http://127.0.0.1:59999",
      SERVICE_TIMEOUT_MS: "200"
    },
    stdio: ["ignore", "pipe", "pipe"]
  });

  try {
    await waitForGatewayReady(gateway, gatewayPort);

    const response = await fetch(`${gatewayBaseUrl}/api/orders?page=1`);
    assert.equal(response.status, 502);
    const payload = await response.json();
    assert.equal(payload.error, "orders_unavailable");
    assert.equal(typeof payload.correlationId, "string");
    assert.ok(payload.correlationId.length > 0);
  } finally {
    gateway.kill("SIGTERM");
  }
});
