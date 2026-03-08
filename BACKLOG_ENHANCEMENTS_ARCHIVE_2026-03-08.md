# BACKLOG_ENHANCEMENTS

## Prioritization Framework

Legend:

- `P0`: blocks core reliability/usability
- `P1`: high-value platform improvement
- `P2`: important but not blocking
- `P3`: longer-horizon enhancement

## P0 (Immediate)

### ~~1) Decouple composition from DB writes~~ ✅ DONE

Resolution:

- `/api/session/compose` catches Postgres error code `42P01` (table missing).
- Sets `persistence_status: "skipped"` and returns `200` with full normalized context.
- Sessions endpoint (`/api/sessions`) returns `[]` instead of `500` when schema is absent.

### ~~2) Standardize Markdown frontmatter parsing~~ ✅ DONE (partial)

Resolution:

- `parseArtifact` fallback handles legacy files placing headings before frontmatter.
- `normalizeArtifactMetadata` fills `name`, `title`, `description`, `category` from body content when frontmatter is incomplete.

### ~~3) Fix CLI render contract~~ ✅ DONE

Resolution:

- Added `isNormalizedContext()` type guard to `core/src/index.ts`.
- `/api/context/render` now detects whether the body is a pre-composed `NormalizedContext` (presence of `full_composed_prompt`, `system_prompt`, `developer_prompt` as strings) and adapts it directly without calling `composeContext`.
- Raw input bodies (`profile_id`, `standards[]`, etc.) still trigger full composition as before (path A).
- CLI `compose | render` pipe is now fully deterministic — render never touches the filesystem.

### ~~4) CI artifact linter for frontmatter~~ ✅ DONE

Resolution:

- Implemented `ArtifactValidator` in `core/src/validation/`.
- Standardized required fields (`id`, `type`, `version`, `title`/`name`).
- Added recursive circular dependency checks and cross-artifact ID collision detection.
- Engine now runs full registry validation at startup.

### ~~5) API schema validation layer~~ ✅ DONE (Artifacts)

### ~~8) Provider abstraction layer~~ ✅ DONE

Resolution:

- Refactored `toOpenAIChatMessages`, `toAnthropicMessages`, etc., into a plugin-based system in `core/src/adapters/`.
- Stateless, high-level `Adapter` interface allows for plug-and-play LLM provider support.

## P1 (Next)

### 5) Local Enhancer Agent (Profiles + Standards) ✅ DONE

Resolution:

- Added first named agent endpoint: `POST /api/agents/enhancer/profile`.
- Added standards enhancer endpoint: `POST /api/agents/enhancer/standard`.
- Wired Profile editor `Enhance` button to send markdown for local LLM enhancement.
- Wired Standards editor `Enhance` button with matching in-editor replacement and undo flow.
- Added output validation guard for required Profile frontmatter/body structure.
- Added output validation guard for required Standard frontmatter/body structure.
- Added model fallback retries when top-ranked output is invalid.
- Added in-editor replacement flow with one-click undo.
- Added embedding-based dynamic model selection (`nomic-embed-text`) across `llama3.2:latest`, `lfm2.5-thinking:latest`, and `granite4:latest` to bias for faster responses on simpler inputs.

### 9) MCP Integration (Model Context Protocol) ✅ DONE

Resolution:

- Launched `mcp/` server implementing the Stdio transport.
- Exposes all ENGAGEntic artifacts as **Resources**.
- Provides **Tools** for remote composition and rendering by IDE assistant agents.

### 6) Test coverage baseline

- Unit tests for `composeContext`, `normalizeContext`, adapters.
- Integration tests for core endpoints.
- Snapshot tests for normalized payload formats.

### 7) Library management operations (CRUD) ✅ DONE (Profiles + Standards + Specifications)

- **UI/API CRUD** implemented for Role Profiles, Standards, and Specifications.
- **Markdown Editor** with live preview integrated.
- **Validation** handles path resolution and filename sanitization.
- [ ] **P1: Unified UI/Core Shared SDK** - Eliminate manual URL construction and implicit types (Maintainability).
- [ ] **P1: Prompt Diff & History** - Dedicated UI for comparing composed session outputs across versions or profiles.
- [ ] **P2: Native LangChain/CrewAI Adapters** - Expand standard adapter library (Extensibility).
- **Automated Directive Compliance**: Integrate programmatic checks for [DIRECTIVES.md](./DIRECTIVES.md) rules (deployment drift, seed data visibility) into the engine's boot sequence.

### 8) Session diff robustness

- Stable prompt version storage strategy.
- Side-by-side diff with semantic section highlighting.

## P2 (Mid-Term)

### 10) Observability

- Structured logs with request IDs.
- Composition metrics (latency, artifact count, persistence success).
- Health and readiness endpoints per service.

### 11) Security hardening tranche

- Authn/authz for non-local environments.
- Secret scanning and dependency scanning in CI.
- Policy checks for registry contributions.

## P3 (Longer-Horizon)

### 12) Multi-workspace / team support

- Workspace-scoped libraries and sessions.
- Role-based editing and approvals.

### 13) Standard package ecosystem

- Versioned standard bundles.
- Signed registry packages.
- Compatibility matrix for profiles/specifications/workflows.

## P4 (Workflow Track)

### Workflow engine expansion

- Re-integrate and expand process guidance (Workflow) support with step-by-step logic.

### Workflow CRUD completion

- Extend CRUD patterns to Workflows.

## Technical Debt Register

- UI typing remains mostly `any`.
- Legacy comments/documentation mismatch in some modules.
- CSS central file is large and should be modularized by feature.
- Core API route handlers combine orchestration and persistence logic.

## Recommended Sprint Sequence

1. ~~P0 architecture maturity package (Core Refactor)~~ ✅ DONE
2. P1 platform quality package:
   - test coverage
   - session diff hardening
3. P2 agent readiness package:
   - observability
   - security tranche
