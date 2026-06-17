# Copilot Instructions for api-gateway

This repository is the upstream entrypoint between the portal and downstream services in the SDLC demo.

## Load order
1. Read `.github/instructions/global-engineering-standards.md`.
2. If the task changes API routing, service orchestration, or request/response behavior, also read `.github/instructions/backend-rules.md` when present.
3. Read the GitHub issue body and follow its task-specific constraints.

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
