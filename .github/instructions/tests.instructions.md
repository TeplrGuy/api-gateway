# Deterministic Testing Instructions

## Core rule
All implementation PRs must include deterministic test evidence from three layers when applicable:
1. Unit/syntax checks (`npm run test:unit`)
2. Integration checks (`npm run test:integration`)
3. End-to-end checks for user-facing flows (`npm run test:e2e` where available)

## Test design rules
- No live external network dependency in unit/integration tests.
- Use stable inputs and explicit assertions; no sleep-based flaky expectations.
- Add tests for bug fixes before closeout.
- Keep tests scoped to changed behavior.

## Cost governance
- Run E2E only when UI-critical paths change.
- Keep load tests manual/dispatch-driven for epic checkpoints.
- Prefer fast integration smoke checks on every PR; reserve expensive tests for high-risk deltas.

## Required PR evidence
- Unit result snippet
- Integration result snippet
- E2E result snippet (or explicit N/A rationale)
- If throughput-sensitive: load-test decision and link to run