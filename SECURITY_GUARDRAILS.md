# SECURITY_GUARDRAILS

## Scope

This document defines baseline security expectations for ENGAGEntic local development and the path to production-hardening.

## Security Objectives

- Prevent prompt/library tampering without audit visibility.
- Limit blast radius of service compromise.
- Protect secrets and model/runtime endpoints.
- Maintain composition traceability and reproducibility.

## Threat Model (Current)

Assets:

- Standards libraries (`profiles`, `standards`, specifications, workflows)
- Session history (`context_sessions`, `prompt_versions`)
- Runtime credentials (`.env`)
- Local AI runtime (`engagentic_ai`)

Primary threats:

- Malicious Markdown content injection
- Unsafe registry contributions
- Secret leakage in prompts, logs, or code
- Open local API surface misuse
- Dependency and container image drift

- Postgres writes use parameterized SQL placeholders.
- Dockerized service boundaries for core dependencies.
- Helmet and CORS middleware on core API.
- File-based libraries tracked in Git for auditability.
- **Artifact Validation System**: `ArtifactValidator` enforces strict frontmatter schemas and prevents ID collisions / broken lineages.
- **Registry Checksumming**: `artifact_manifest.json` tracks content hashes to detect unauthorized filesystem tampering.
- **Session Protocol Compliance**: Strict adherence to **[DIRECTIVES.md](./DIRECTIVES.md)** ensures that the runtime environment is always in a verified, non-null, and recently-deployed state.

## Guardrails: Required Immediately

1. Request/Response Validation

- Validate all API request bodies with strict schemas.
- Enforce max payload sizes.
- Guard `user_task` maximum length.

2. Secrets Hygiene

- Never commit `.env`.
- Rotate DB credentials periodically.
- Add a pre-commit secret scanning gate.

3. Logging Safety

- Redact secrets from logs.
- Do not log full sensitive user task payloads by default.

4. Network Hardening

- Restrict exposed ports in production profiles.
- Enforce reverse proxy TLS termination for remote deployments.


## Guardrails: Ollama Runtime

- Treat `9094` as internal service endpoint, not public.
- Apply explicit resource limits (`cpus`, memory where available).
- Version-pin approved models in a controlled allowlist.
- Validate model pull integrity and maintain model provenance notes.
- For enhancer endpoints, enforce strict output validation before accepting model output into persisted profile artifacts.

## Guardrails: Scout Community Intake

- Community ingestion must prioritize reusable operational guidance over popularity signals alone.
- Exclude repositories whose primary value is one-time setup/onboarding/installation flow.
- Require security-signal presence before Community ingestion.
- Maintain provenance metadata (`source_repo`, `source_url`, stars) for every Community artifact.
- Provide operator reset capability (`POST /api/community/purge`) to remove low-quality community artifacts and trigger controlled refill.

## Access Control Strategy (Target)

- Local dev: no auth (loopback only).
- Shared environments:
  - gateway authentication
  - role-based authorization for:
    - standards writes
    - profile/specification/workflow modifications
    - session history read/export

## Supply Chain Controls

- Pin base image digests where feasible.
- Add dependency vulnerability scanning in CI.
- Maintain update cadence:
  - Node packages monthly
  - Docker base images monthly
  - emergency patch within 24h for critical CVEs

## Secure Coding Conventions

- Parameterized DB access only.
- No dynamic `eval` or untrusted code execution.
- Explicit type narrowing and null-handling in API handlers.
- Fail closed on parse/validation errors.

## Data Retention

- Define retention for `context_sessions` and `prompt_versions`.
- Provide purge command for local developer data.
- Avoid storing unnecessary raw prompts in long-lived environments.

## Incident Response (Minimum)

1. Contain
- stop impacted containers
- isolate data volume snapshots

2. Investigate
- pull gateway/core/db logs
- inspect recent library and config changes

3. Recover
- rotate credentials
- redeploy known-good images
- restore from verified backups if needed

4. Prevent
- add test/regression guard based on root cause

## Security Checklist for Releases

- [ ] Dependency and image scan clean for high/critical issues
- [ ] API payload schemas enforced
- [ ] Artifact linter passes
- [ ] Secrets scan passes
- [ ] Logging redaction verified
- [ ] Auth boundary decision documented for target environment
- [ ] Compliance with [DIRECTIVES.md](./DIRECTIVES.md) verified (Seed data visibility & CD)
