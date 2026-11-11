function scrubRequest(span, request) {
  const raw = request.url || request.path || '';
  const path = typeof raw === 'string' ? raw.split('?')[0] : '';
  const safe = /^\/(?:api\/)?orders\/[^/]+$/.test(path) ? path.replace(/\/[^/]+$/, '/:orderId')
    : /^\/notifications\/order\/[^/]+$/.test(path) ? '/notifications/order/:orderId'
    : /^\/(?:api\/)?inventory\/[^/]+$/.test(path) && !path.endsWith('/reserve') ? path.replace(/\/[^/]+$/, '/:sku')
    : ['/health', '/api/health', '/api/orders', '/orders', '/inventory/reserve', '/notifications/order-created'].includes(path) ? path
    : '/[redacted]';
  span.setAttribute('url.path', safe);
  span.setAttribute('http.route', safe);
  span.setAttribute('http.target', safe);
  span.setAttribute('url.full', '[redacted]');
  span.setAttribute('http.url', '[redacted]');
  span.setAttribute('url.query', '[redacted]');
}

if (process.env.APPLICATIONINSIGHTS_CONNECTION_STRING || process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
  process.env.OTEL_SERVICE_NAME ||= 'api-gateway';
  const { useMicrosoftOpenTelemetry } = require('@microsoft/opentelemetry');
  const { registerInstrumentations } = require('@opentelemetry/instrumentation');
  const { UndiciInstrumentation } = require('@opentelemetry/instrumentation-undici');
  useMicrosoftOpenTelemetry({
    azureMonitor: process.env.APPLICATIONINSIGHTS_CONNECTION_STRING
      ? { azureMonitorExporterOptions: { connectionString: process.env.APPLICATIONINSIGHTS_CONNECTION_STRING } }
      : undefined,
    enableConsoleExporters: false,
    instrumentationOptions: { http: { enabled: true, requestHook: scrubRequest } }
  });
  registerInstrumentations({ instrumentations: [new UndiciInstrumentation({ requestHook: scrubRequest })] });
}
