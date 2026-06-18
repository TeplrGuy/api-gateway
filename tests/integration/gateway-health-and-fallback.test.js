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

test("api-gateway health endpoint and downstream fallback", async () => {
  const port = String(3600 + Math.floor(Math.random() * 200));
  const baseUrl = `http://127.0.0.1:${port}`;
  const child = spawn("node", ["src/index.js"], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: port, SERVICE_TIMEOUT_MS: "200" },
    stdio: "ignore"
  });

  try {
    await waitForHealth(baseUrl);

    const health = await fetch(`${baseUrl}/health`);
    assert.equal(health.status, 200);
    const healthJson = await health.json();
    assert.equal(healthJson.service, "api-gateway");

    const fallback = await fetch(`${baseUrl}/api/orders/test-order-id`);
    assert.equal(fallback.status, 502);
    const fallbackJson = await fallback.json();
    assert.equal(fallbackJson.error, "orders_unavailable");
  } finally {
    child.kill("SIGTERM");
  }
});
