# ENGAGEntic

ENGAGEntic is a context composition platform for AI systems. It assembles reusable prompt artifacts from Markdown libraries into normalized context payloads, renders them for multiple frameworks, and provides a UI + CLI for authoring and operations.

<img width="1857" height="1104" alt="image" src="https://github.com/user-attachments/assets/01c4baf8-43d1-47bd-acb9-aa7ef705aa49" />

## What It Does

- Composes layered context from hierarchical Markdown artifacts:
  - **Asset Inheritance**: `profile` extends `parent_profile` via `extends` frontmatter.
  - **Shared Includes**: Artifacts can include shared `standards` via `includes`.
  - **Artifact Resolution**: Automatic dependency resolution and circular loop protection.
- Produces normalized prompt payloads via **Adapter Plugin Architecture**:
  - `plain` (monolith text)
  - `openai` (message array)
  - `anthropic` (system + messages)
  - `generic` (triple-prompt structure)
  - `langchain` / `agentic` (upcoming)
- Features **Artifact Registry & Manifest**:
  - High-performance `artifact_manifest.json` indexing.
  - Checksum validation and change tracking.
- **MCP (Model Context Protocol)** Server:
  - Exposes ENGAGEntic artifacts and tools to VS Code / Cursor agents.
- Stores composed sessions in Postgres for history workflows.
- Professional **Markdown Editor** with live preview and **Full CRUD** for Profiles, Standards, and Specifications.
- Built-in **Enhancer Agent** for Profiles and Standards:
  - Profiles: `/api/agents/enhancer/profile`
  - Standards: `/api/agents/enhancer/standard`
  Both rewrite markdown via local Ollama and return validated frontmatter/body output.
- Built-in **Agentic Scout** for Community specification maintenance:
  - Health/status: `/api/agents/scout/health`
  - Purge/reseed trigger: `POST /api/community/purge`
  - Maintains a target of 5 `Community`-tagged specifications by sourcing starred GitHub prompt-spec repos and ingesting derived Community spec/profile/standard artifacts.
- Local Ollama runtime (`engagentic_ai`) for model preloading.

## Runtime Services

- UI: `http://localhost:9090`
- Engine API Gateway: `http://localhost:9092/api`
- Core engine: `http://localhost:9091`
- **MCP Server**: `stdio` (via `mcp/` directory)
- Postgres: `localhost:9093`
- Ollama service: `http://localhost:9094`

Health responses include platform version metadata (`version`, default `v0.2.2-stable`) for synchronization checks across UI/API/docs.

## Repository Map

- `core/`: Context engine & registry (Express + TypeScript)
- `mcp/`: Model Context Protocol server (Stdio + SDK)
- `ui/`: Context IDE / playground (React + Vite + TypeScript)
- `cli/`: Terminal CLI for operations
- `api/`: Nginx API gateway
- `db/`: Postgres image + bootstrap
- `ai/`: Ollama container bootstrap
- `profiles/`: Role baselines (supports inheritance)
- `workflows/`: Operational execution guidance routines
- `standards-library/`: Curated core standards
- `standards-registry/`: Community/extension standards
- `spec-templates/`: Saved specifications & task templates
- `core/artifact-registry/`: Generated manifest and indexing logic
- `core/adapters/`: Plug-and-play provider adapters
- `core/validation/`: Artifact linting and schema validation

## Documentation Index

- [ARCHITECTURE_DESIGN.md](./ARCHITECTURE_DESIGN.md)
- [SECURITY_GUARDRAILS.md](./SECURITY_GUARDRAILS.md)
- [BACKLOG_ENHANCEMENTS.md](./BACKLOG_ENHANCEMENTS.md)
- [SETUP_STEPS.md](./SETUP_STEPS.md)
- [CHANGE_LOG.md](./CHANGE_LOG.md)
- [SESSION_CHAIN.md](./SESSION_CHAIN.md)
- [DIRECTIVES.md](./DIRECTIVES.md)

## Quick Start

1. Configure `.env` with Postgres credentials expected by `docker-compose.yml`.
2. Start everything:

```bash
docker compose up -d --build
```

3. Open UI at `http://localhost:9090`.
4. Validate services:

```bash
curl http://localhost:9091/health
curl http://localhost:9092/api/standards
curl http://localhost:9094/api/tags
```

## Notes on Current Behavior

- The compose endpoint attempts to persist sessions to Postgres. If the `context_sessions` schema is absent, it degrades gracefully — composition still returns `200` with a `persistence_status: "skipped"` field rather than failing.
- Legacy Markdown files that place a heading before frontmatter are handled via a fallback parser; metadata extraction is best-effort on those files.
- Profile enhancement uses embedding-assisted model routing (`nomic-embed-text:latest`) to rank and select the fastest suitable model across `llama3.2:latest`, `lfm2.5-thinking:latest`, and `granite4:latest`, with fallback to the next-ranked model when validation fails.
- Standard enhancement uses the same embedding-assisted model routing and fallback behavior, with standard-specific frontmatter validation (`type: standard`, `title|name`, `category`, etc.).
- CLI `render` accepts a pre-composed `NormalizedContext` payload and short-circuits directly to adapter rendering when detected.
- Scout candidate selection now includes reusable-content guardrails in addition to stars/security signals. Repositories focused on one-time installation/setup flows are excluded from Community ingestion.
- UI libraries auto-refresh in the background so Scout-ingested Profiles/Standards/Specifications appear without manual browser refresh.

## Session Resume Snapshot (2026-03-08)

- Community control-plane is now specification-count driven (`Community` tag on Specifications is the Scout target source of truth).
- Community artifacts can be purged and reseeded with `POST /api/community/purge` (also wired to dashboard Scout card purge action).
- Profiles, Standards, and Specifications views render user-created items first, Community items below, with section separation.
- Scout-generated naming prefixes (`Scout Profile:`, `Scout Standard:`, `Scout Spec:`) were removed; Community provenance is represented by `Community` tagging.

## License

Internal/open-source project metadata not yet finalized in this repository.
