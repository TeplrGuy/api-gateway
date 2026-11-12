# api-gateway

Node.js service baseline for the SDLC demo.

## Order list proxy

`GET /api/orders?page=1&limit=10&status=new_order&search=widget&orderId=demo`
forwards the query unchanged to `orders-service GET /orders`. It preserves the
downstream JSON/status and forwards or generates `x-correlation-id`, including on
proxy failures. Transport and malformed JSON failures return `502
orders_unavailable`; header/body timeouts return `504 orders_timeout`. Business
filters and status mapping remain in the provider. Existing create/tracking
routes remain unchanged.

Run `npm ci` and `npm test` for focused proxy and integration checks. Run
`npm run test:e2e` with matching sibling `orders-service`/`shared-contracts`
checkouts, or set `ORDERS_SERVICE_PATH`/`CONTRACTS_PATH` to their paths. The test
starts real provider/gateway HTTP servers and validates actual responses with
the shared schema. It requires `curl` and prints an actual filtered/paginated
curl response as PR evidence. Only inventory/notifications boundaries are stubbed.

The compatibility CI uses immutable provider/contracts revisions; update both
pins intentionally when changing the coordinated contract. It is service-path
evidence, not a Playwright run, cloud-agent execution or Azure deployment.

Dependencies: `TeplrGuy/shared-contracts#3` -> `TeplrGuy/orders-service#4` -> this
repo's issue #3 -> `TeplrGuy/portal-web#4` and #6; parent epic `portal-web#2`.
Roll out in that order. Rollback removes the new list route with its callers
while retaining create/tracking. Contract/UI status alignment still needs
human confirmation; do not close the epic from these backend changes alone.

## Agentic review runtime

The PR review lock is generated with gh-aw v1.2.2, matching the compile workflow's
CLI version. Do not edit the generated lock. With that compiler installed, run:

```sh
gh aw compile ghaw-pr-review --no-check-update --action-mode action --action-tag 53d0749e19424a918acd82b4d140264ce48f2f14
```

The immutable action revision is the preserved v1.2.2 setup revision. This upgrade
replaces the v0.79.8 runtime that failed to locate `copilot_harness.cjs`. Verify an
actual PR-triggered run before declaring the runtime repaired. The previously
approved 250-credit limit removes the old four-credit cap, not runtime or access
failures. Safe outputs remain one comment and up to three labels; this workflow
cannot approve, merge or deploy. Its advisory review does not replace human
coverage verification.
Reviewers must inspect the full patch (API or exact base/head Git diff), cite
source/test lines and report blocked evidence explicitly. A PR body, diff stat
or pending review check cannot substitute for code inspection or failed CI.

