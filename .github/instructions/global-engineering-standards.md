# Global Engineering Standards

These standards apply across the SDLC demo repositories unless a task explicitly tightens them.

## Scope and change discipline
- Make the smallest complete change that satisfies the issue.
- Prefer traceable issue-by-issue delivery over broad refactors.
- Keep cross-repo contracts explicit; do not introduce hidden coupling.

## Code quality
- Match the existing language and framework used by the repo.
- Favor clear names, short functions, and simple control flow.
- Keep files cohesive; extract helpers when a file starts mixing concerns.
- Add comments only when they explain why a choice exists.

## Security
- Never hardcode secrets, credentials, or tokens.
- Use environment variables for runtime configuration.
- Do not log secrets, tokens, or sensitive user data.
- Keep public endpoints intentionally minimal and documented.

## Testing
- Add or update tests when behavior changes.
- Keep tests close to the user-visible or contract-visible behavior they verify.
- Prefer fast deterministic tests first, then broader workflow tests when needed.
- Treat **unit or service-level automated tests** as mandatory for implementation work.
- Treat **end-to-end validation** as mandatory for implementation work:
  - UI changes: Playwright or equivalent browser flow coverage.
  - API/backend changes: end-to-end validation through the affected upstream path (gateway, consumer, or curl-driven integration path).
  - Contract changes: downstream validation proving the changed contract is consumable.
- No issue is complete until both the narrow automated tests and the end-to-end validation evidence are linked in the PR or issue.

## API and contract discipline
- Preserve backward compatibility unless the issue explicitly allows a breaking change.
- Use clear response shapes and meaningful error messages.
- If a contract changes, update the contract source and all impacted consumers together.

## Git and pull requests
- Use conventional commit style in examples and generated summaries.
- Reference the GitHub issue being implemented.
- For UI changes, include a screenshot in the issue or PR evidence.

## Observability
- Preserve correlation IDs across service boundaries.
- Log important lifecycle events and failures with enough context to debug.
- Keep health endpoints simple and stable.

## Deployment mindset
- Optimize for Azure deployability and repeatable CI behavior.
- Avoid local-only assumptions in paths, ports, or service discovery.

## Escalation
- Escalate when a task would require production secrets, workflow permission changes, or repo-wide breaking changes.
