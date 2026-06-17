# Contributing

## Execution model

1. One issue has one primary owner.
2. One branch has one implementation owner (local or delegated).
3. Review responsibilities stay separate from implementation.
4. For parallel work, split by file/module boundaries.

## One-file-one-agent rule

- Do not have multiple agents edit the same file in the same wave.
- Define ownership per file set before implementation starts.
- If overlap appears, stop and re-plan the wave split.

## Required quality gates

- CI green
- Security workflow green
- Feature-specific validation (Playwright/load test when applicable)
- Human PR review complete

## PR expectations

Use the repository PR template and include evidence links for:
- tests,
- workflow runs,
- risk/rollback decisions.

