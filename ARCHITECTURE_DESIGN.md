# ARCHITECTURE_DESIGN

## Purpose

This document defines the implemented architecture of ENGAGEntic and the target architecture direction for near-term evolution.

## System Overview

ENGAGEntic is a file-backed context composition platform with optional persistence and local model runtime support.

Core responsibilities:

- Parse Markdown artifacts from library directories.
- Index and validate artifacts via **Artifact Registry**.
- Compose context with **Recursive Inheritance** and Dependency Resolution.
- Normalize and adapt context payloads via **Adapter Plugins**.
- Expose artifacts and tools to external agents via **MCP Server**.
- Execute local agent actions (e.g., Profile Enhancer) against Ollama-backed models.
- Execute autonomous local agent actions (e.g., Agentic Scout) for Community specification replenishment.
- Persist composed sessions for history.
- Expose UI and CLI interaction surfaces.

## Service Topology

Current Docker services:

- `engagentic_ui` (Vite/React) on `9090`
- `engagentic_api` (nginx gateway) on `9092`
- `engagentic_core` (Express engine) on `9091`
- `engagentic_mcp` (MCP Server) on `stdio` (integrated)
- `engagentic_db` (Postgres 17) on `9093` host mapping
- `engagentic_ai` (Ollama runtime) on `9094`

Request path (UI):

`Browser -> UI (9090) -> API Gateway (9092/api/*) -> Core Engine (9091) -> Postgres (db)`

Model runtime path (future agent workflows):

`Agent Runtime -> engagentic_ai (9094)`

Version contract:

- Core health endpoints return `version` (default `v0.2.2-stable`) to maintain UI/API/documentation synchronicity.

## Composition Pipeline

Pipeline stages:

1. **Discovery & Manifest (Boot)**: Engine scans library directories and builds `artifact_manifest.json` with checksums and hierarchy indexing.
2. **Validation**: Artifacts are linted for frontmatter schema compliance.
3. **Resolution**: Artifact IDs are matched against the registry.
4. **Inheritance Expansion**:
    - `extends` chains are resolved (Profile -> Parent Profile).
    - `includes` dependencies are fetched recursively.
    - Circular dependency check performed.
5. **Normalization**: Layer results flattened into `NormalizedContext`.
6. **Rendering**: Dispatched to the requested **Adapter Plugin**.
7. **Persistence**: Composed prompt saved to `context_sessions` with persistence status reporting.

## Artifact Registry

A high-performance indexing layer that maps artifact IDs to filesystem paths.

- **Manifest**: `artifact_manifest.json` (auto-generated)
- **Tracing**: Maps parent/child relationships to enable fast graph traversal during composition.

## Data Sources

Filesystem-first library backed by **Named Docker Volumes** for durable persistence:

- `engagentic_profiles` -> `/usr/src/app/profiles/`
- `engagentic_standards` -> `/usr/src/app/standards-library/`
- `engagentic_registry` -> `/usr/src/app/standards-registry/`
- `engagentic_specifications` -> `/usr/src/app/spec-templates/`

Named volumes ensure that CRUD operations performed via the UI persist across container restarts and image rebuilds. 

Database tables (current):

- `standards_meta`
- `context_sessions`
- `prompt_versions`

## Core Domain Model

`NormalizedContext` enriched metadata:

- `artifact_lineage`: Sequence of resolved artifact IDs.
- `artifact_versions`: Snapshot of versions for every contributor.
- `composition_trace`: Step-by-step resolution log for auditability.
- `context_version`: Canonical version of the normalized payload.

## Adapters (Plugin Architecture)

Adapters are now modular plugins implementing a common `Adapter` interface:

- `plain`: Returns monolithic prompt.
- `openai`: Returns typed message array.
- `anthropic`: Returns system/messages payload.
- `generic`: Returns triple-prompt object.

## MCP Server

Exposes ENGAGEntic to the **Model Context Protocol** ecosystem.

- **Resources**: `engagentic://artifacts/{type}/{id}`
- **Tools**: `compose_context`, `render_context`

## UI Architecture

Main UI modules:

- Dashboard summary (Stats & Core Definitions)
- Profiles viewer (Role baselines & Full CRUD)
- Standards viewer (Cards & Full CRUD)
- Specifications viewer (Saved Profile, Standards, Workflow sets & Full CRUD)
- Composer (Two-column assembly playground)

UI data access:

- Centralized URL construction via `ui/src/lib/api.ts`.
- Browser fetches directly to gateway (`http://localhost:9092/api`).

## CLI Architecture

CLI commands:

- `standards list`
- `compose`
- `render`
- `preview`

Current behavior supports unix-style compose/render chaining with deterministic pass-through rendering when `render` receives a pre-composed `NormalizedContext`.

## Ollama Runtime Architecture

Service: `engagentic_ai`

- Image built from `ollama/ollama:latest`
- Bootstrap script starts `ollama serve`
- Pulls:
  - `nomic-embed-text:latest`
  - `llama3.2:latest`
  - `lfm2.5-thinking:latest`
  - `granite4:latest`
- Persistent model cache via `ollama_data` volume
- CPU hard cap: `10.0` CPUs (leaves 4 cores on a 14-core host)
- Profile Enhancer Agent:
  - Endpoint: `POST /api/agents/enhancer/profile`
  - Model router: `nomic-embed-text:latest` embeddings + cosine ranking
  - Candidate generation models: `llama3.2:latest`, `lfm2.5-thinking:latest`, `granite4:latest`
  - Execution strategy: run highest-ranked model first, then fallback to next-ranked model on validation failure
  - Contract: returns validated Profile markdown with required frontmatter + enhanced body guidance.
- Standard Enhancer Agent:
  - Endpoint: `POST /api/agents/enhancer/standard`
  - Shares model router and ranked fallback strategy with Profile Enhancer
  - Contract: returns validated Standard markdown with required frontmatter + enhanced standards guidance.
  - Runtime note: immediately after container restart, first enhancer request may fail while Ollama finishes warm-up/pulls.
- Agentic Scout:
  - Endpoint: `GET /api/agents/scout/health`
  - Endpoint: `POST /api/community/purge` (deletes Community profiles/standards/specifications and triggers Scout refill)
  - Trigger model: background loop + event trigger on Community specification deletion.
  - Control-plane: only `Community`-tagged **Specifications** count toward the Scout target.
  - Behavior: when Community specification count drops below 5, Scout discovers starred GitHub AI prompting repos, ingests replacement Community specifications, and creates associated profile/standard artifacts with provenance metadata.
  - Candidate guardrails:
    - Requires security signals and reusable guidance signals.
    - Rejects one-time setup/install/onboarding-oriented repositories.
    - Rejects disallowed repository naming patterns (e.g., jailbreak/prompt-hack style patterns).

## Session Continuation State (2026-03-08)

- Dashboard Scout card includes purge control for Community reseeding.
- UI library pages now separate user and Community artifacts into distinct sections.
- Frontend polling auto-refreshes artifact lists so Scout ingestions appear without manual page refresh.

## Current Constraints / Known Gaps

- ~~Compose path hard-fails when DB schema is absent.~~ **Resolved** — compose degrades gracefully with `persistence_status: "skipped"` when `context_sessions` table is missing (`TABLE_MISSING` / Postgres error code `42P01`).
- Metadata parsing depends on valid frontmatter placement; fallback parser handles legacy heading-before-frontmatter files on a best-effort basis.
- ~~Render endpoint currently re-composes rather than directly rendering normalized payload input.~~ **Resolved** — `isNormalizedContext()` type guard added; render short-circuits when a pre-composed payload is detected.
- No authn/authz boundary in local developer mode.
- No typed shared SDK between UI and engine.

## Target Near-Term Architecture

1. ~~Introduce schema validation for API contracts.~~ **Done** (Artifact Validation).
2. ~~Add artifact linting for frontmatter correctness.~~ **Done**.
3. ~~Fix CLI render contract so `render` directly renders a provided normalized payload.~~ **Done**.
4. Add native support for LangChain and CrewAI adapters.
5. Implement OTel-compatible tracing for composition pipelines.

## Design Principles

- **Registry-First**: Discovery via manifest, execution via filesystem.
- **Traceable Composition**: Every prompt contributor must be tracked.
- **Provider-Agnostic**: Core engine is independent of LLM SDKs.
- **Fail-Fast Validation**: Schema errors caught at registry build, not runtime.
- **Agent-Ready**: Native MCP integration for IDE AI leverage.
- **Session-Specific Governance**: Adhere to development rules defined in [DIRECTIVES.md](./DIRECTIVES.md).

## Non-Goals (Current Phase)

- Multi-tenant auth platform
- Distributed orchestration
- Production-grade HA deployment templates
- WYSIWYG authoring CMS (we prefer Markdown code-first)
