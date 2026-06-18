# Copilot Instructions for api-gateway

This repository is the upstream entrypoint between the portal and downstream services in the SDLC demo.

## Load order
1. Read `.github/instructions/global-engineering-standards.md`.
2. If the task changes API routing, service orchestration, or request/response behavior, also read `.github/instructions/backend-rules.md` when present.
3. Read the GitHub issue body and follow its task-specific constraints.

## Mandatory skill bootstrap (cloud and local)
1. Read `.github/skills/skills.lock.json`.
2. Read `.github/skills/skills-manifest.json`.
3. Load at least one relevant skill contract before implementation:
   - Issue shaping/triage: `.github/skills/issue-triage/v1/SKILL.md`
   - PR analysis/review: `.github/skills/pr-review/v1/SKILL.md`
   - Test strategy: `.github/skills/test-plan/v1/SKILL.md`
   - Contract or response-shape impact: `.github/skills/contract-impact/v1/SKILL.md`
   - Incident handling: `.github/skills/incident-response/v1/SKILL.md`
4. Follow the active skill output contract (`summary`, `evidence`, `risk`, `actions`) when posting issue/PR conclusions.
5. If required skill files are missing, stop and call out the gap instead of improvising.
6. Token discipline:
   - Read minimally: issue/PR body, changed files, and referenced constraints first.
   - Do not paste long logs/files; link them and summarize in bullets.
   - Keep working summaries concise and evidence-first.

## Repo intent
- Keep the gateway focused on routing, composition, validation, and traceability.
- Do not let business logic drift here when it belongs in downstream services.
- Keep the gateway predictable for the portal and easy to reason about in demos.

## Architecture guardrails
- Preserve clear boundaries between gateway orchestration and service ownership.
- Maintain correlation IDs across every downstream call.
- Prefer explicit transforms over hidden shape changes.
- Keep failure handling visible and diagnosable.

## Safety boundaries
- Do not embed portal UI assumptions in the gateway.
- Do not duplicate long-term business rules from downstream services.
- Escalate if a change would alter the upstream/downstream contract model across repos.
