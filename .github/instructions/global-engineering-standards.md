# Global Engineering Standards

These standards apply across the SDLC demo repositories unless a task explicitly tightens them.

> **Philosophy** (from practitioners): Code is less precious — don't be afraid to throw it away or rewrite.
> Why spend three days on a design doc when you can prototype all three approaches in an hour?
> When you can build anything, more energy must go into *"what should we build?"*
> Good tests are your safety net.

## Scope and change discipline

- Make the smallest complete change that satisfies the issue.
- **Smaller, more verifiable units of work** — prefer atomic slices over broad features.
- Prefer traceable issue-by-issue delivery over broad refactors.
- Keep cross-repo contracts explicit; do not introduce hidden coupling.
- Learn by doing: prototype first, refine second. Rewrites are normal and healthy.

## Feedback loop (keep it fast)

- **Faster tests**: unit tests must run in < 30 seconds locally.
- **Stricter linters**: lint must pass before a PR can be opened. No exceptions.
- **Deterministic formatting**: auto-format on save; formatting errors fail CI immediately.
- **Better CI feedback loops**: CI must report red/green within 3 minutes of a push.
- A slow feedback loop is a bug. Fix it like a bug.

## Code quality

- Match the existing language and framework used by the repo.
- Favor clear names, short functions, and simple control flow.
- Keep files cohesive; extract helpers when a file starts mixing concerns.
- Add comments only when they explain *why* a choice exists.
- **Compounding technical debt is a real cost**: agents can generate a lot of code fast. Discipline on staying close to the actual architecture matters more now, not less.

## Security

- Never hardcode secrets, credentials, or tokens.
- Use environment variables for runtime configuration.
- Do not log secrets, tokens, or sensitive user data.
- Keep public endpoints intentionally minimal and documented.

## Testing

> **Tests are your safety net** — especially when moving fast with agents.

- Add or update tests when behavior changes. No exceptions.
- Keep tests close to the user-visible or contract-visible behavior they verify.
- Prefer fast deterministic tests first, then broader workflow tests when needed.
- Treat **unit or service-level automated tests** as mandatory for implementation work.
- Treat **end-to-end validation** as mandatory for implementation work:
  - UI changes: Playwright or equivalent browser flow coverage.
  - API/backend changes: end-to-end validation through the affected upstream path.
  - Contract changes: downstream validation proving the changed contract is consumable.
- No issue is complete until both the narrow automated tests and the end-to-end validation evidence are linked in the PR or issue.
- **Post-opus review**: after any agent generates significant code, a human must verify test coverage before merging. Agents can build fast — tests ensure it works.

## API and contract discipline

- Preserve backward compatibility unless the issue explicitly allows a breaking change.
- Use clear response shapes and meaningful error messages.
- If a contract changes, update the contract source and all impacted consumers together.

## Git and pull requests

- Use conventional commit style in examples and generated summaries.
- Reference the GitHub issue being implemented.
- For UI changes, include a screenshot in the issue or PR evidence.
- **PRs must be small** — a PR that touches more than 3 files outside its expected scope needs justification.

## Observability

- Preserve correlation IDs across service boundaries.
- Log important lifecycle events and failures with enough context to debug.
- Keep health endpoints simple and stable.

## Ambient quality awareness

- Nightly quality agents run automatically and surface regressions, stale issues, and CI failures.
- Do not ignore nightly quality reports — they are automated early warnings, not noise.
- Performance regressions detected by ambient agents must be triaged within 1 business day.

## Deployment mindset

- Optimize for Azure deployability and repeatable CI behavior.
- Avoid local-only assumptions in paths, ports, or service discovery.

## Escalation

- Escalate when a task would require production secrets, workflow permission changes, or repo-wide breaking changes.
- Escalate when agent-generated code is building something that feels scope-expanding — the question "what should we build?" matters more than the ability to build it.