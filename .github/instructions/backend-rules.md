# Backend Rules for api-gateway

These rules apply when changing gateway routing, request shaping, timeout handling, or upstream/downstream traceability.

## Current stack
- Node + Express service in `src/index.js`.
- Proxies order operations to `orders-service`.
- Exposes inventory passthrough and health endpoints.

## Gateway design rules
- Keep the gateway thin: routing, validation, correlation, and response mediation belong here.
- Do not move durable business rules out of downstream services into the gateway.
- Prefer explicit transformation and propagation over hidden mutation.

## Request and response rules
- Preserve `x-correlation-id` generation and propagation.
- Keep timeout and unavailable scenarios explicit in gateway responses.
- Avoid silently swallowing downstream failure context when it helps the portal demo.

## Endpoint rules
- `/api/orders` and `/api/orders/:orderId` are the main product-facing routes.
- `/api/inventory/:sku` should stay a simple passthrough unless an issue requires composition.
- New gateway endpoints should justify why they belong in the gateway instead of the portal or a downstream service.

## Cross-repo rules
- Any change that affects portal-web or orders-service behavior should reference the linked issue chain.
- Contract-affecting changes must stay aligned with `shared-contracts`.

## Testing and evidence
- Gateway changes should verify both success and downstream failure paths.
- Preserve traceability in logs, headers, and issue evidence.
