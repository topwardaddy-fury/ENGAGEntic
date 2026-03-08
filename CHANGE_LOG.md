### 2026-03-08 (Session Continuation Handoff + Scout Guardrails)

### Features
- **Community Purge Lifecycle Endpoint** — Added `POST /api/community/purge` to remove Community Profiles, Standards, and Specifications and immediately trigger Scout refill.
- **Scout Candidate Guardrails (Reusable Content)** — Added filtering so Scout rejects one-time setup/install/onboarding-oriented repositories and other low-reusability candidates before ingestion.
- **Scout Telemetry Expansion** — Added `last_skipped_not_reusable` to Scout health payload to track guardrail-driven candidate skips.

### UI
- **Dashboard Scout Purge Action** — Added purge control on the Scout card to reset Community artifacts and trigger reseeding.
- **Auto-Refresh for Scout Ingestion Visibility** — Library data now refreshes in the background so new Scout artifacts appear without manual browser refresh.
- **Library Separation Layout** — Profiles, Standards, and Specifications now render user-created entries first and Community entries below, with visual section separation.
- **Card Name Wrapping** — Card titles now wrap instead of truncating/clamping for long repository-based names.

### Documentation
- **Session Continuation Sync** — Updated `README.md`, `ARCHITECTURE_DESIGN.md`, `SESSION_CHAIN.md`, `BACKLOG_ENHANCEMENTS.md`, and `SECURITY_GUARDRAILS.md` to capture the current operational state and next-step priorities for immediate session handoff.

### 2026-03-08 (Scout Agent Implementation)

### Features
- **Scout Agent Runtime** — Added autonomous `Scout Agent` logic in core to maintain a target of 5 `Community` Specifications.
- **Scout Trigger Rules** — Scout now runs when Community Specification count is below target, idles at target, and re-engages after Community Specification deletion.
- **GitHub Discovery + Ingestion** — Scout discovers starred GitHub AI prompting repositories, filters for security signals, and ingests Community specification artifacts with linked profile/standard artifacts plus provenance metadata.
- **Scout Enhancer Conformance** — Scout now runs generated Profile and Standard artifacts through the Enhancer pipeline before ingestion so formatting and frontmatter conform to platform standards.
- **Scout Health API** — Added `GET /api/agents/scout/health` with enabled/running state, target count, current Community count, deficit, and last-run metadata.

### UI
- **Agent Status Stack** — Added bottom-left `Agentic Scout` status item.
- **Scout Activity Indicator** — Added orange blinking indicator while Scout is running (solid orange when active/idle, gray when unavailable).
- **Scout Health Polling** — App now polls Scout health and reflects status in the sidebar.

### Documentation
- **`README.md`** — Added Scout capability and health endpoint details.
- **`ARCHITECTURE_DESIGN.md`** — Added Scout architecture notes and control-plane behavior.

### 2026-03-08 (Directives and Setup Clarification)

### Documentation
- **`DIRECTIVES.md`** — Updated redeployment wording to require redeploy/hot-reload before validation steps, not after every edit in isolation.
- **`DIRECTIVES.md`** — Replaced ambiguous `deploy seed data` reference with the actual mechanism: DB init SQL bootstrap (`db/init/init.sql`) via DB reinitialization.
- **`DIRECTIVES.md`** — Added explicit minimum seed requirement: default profile (`engineering-assistant.md`) must exist.
- **`DIRECTIVES.md`** — Removed Terminology Compliance directive section.
- **`DIRECTIVES.md`** — Narrowed version synchronicity scope to documentation that explicitly mentions versioning.
- **`SETUP_STEPS.md`** — Added seed baseline verification and DB reinitialization recovery steps.
- **`SETUP_STEPS.md`** — Removed obsolete troubleshooting case claiming compose returns `500` when `context_sessions` is missing.
- **`CHANGE_LOG.md`** — Removed superseded historical caveat block from the initial session entry.

### 2026-03-08 (Documentation Handoff Sync)

### Documentation
- **`SESSION_CHAIN.md`** — Expanded enhancer stage from profile-only to profile+standard and updated editor persist stage to cover both artifact types.
- **`SETUP_STEPS.md`** — Corrected profile enhancer request payload key to `markdown`, corrected response key to `enhanced_markdown`, and documented warm-up retry behavior.
- **`BACKLOG_ENHANCEMENTS.md`** — Updated enhancer scope and CRUD completion status to include Standards and current editor parity.
- **`README.md` + `ARCHITECTURE_DESIGN.md`** — Normalized enhancer model references to `:latest` variants and documented current runtime behavior.

### 2026-03-07 (Root Documentation Sync: Runtime + Enhancer)

### Documentation
- **`README.md`** — Removed stale CLI render caveat; documented current direct-render short-circuit behavior for pre-composed payloads.
- **`ARCHITECTURE_DESIGN.md`** — Updated CLI architecture and near-term targets to mark render-contract work as completed.
- **`SESSION_CHAIN.md`** — Added explicit Profile Enhancer stage, fallback/validation recovery path, and profile editor persist stage (`raw_content` round-trip behavior).
- **`SETUP_STEPS.md`** — Added `llama3.2:latest` to expected Ollama models, added enhancer endpoint verification step, and expanded enhancer troubleshooting guidance.
- **`BACKLOG_ENHANCEMENTS.md`** — Removed contradictory unresolved P0 render checkbox and aligned enhancer fallback language with model-router strategy.

### API
- **Version Synchronicity Hook** — Added `version` field (`v0.2.2-stable` by default) to core health responses (`/health`, `/api/agents/enhancer/health`) so UI/API/docs version checks can be validated consistently.

### UI
- **Enhancer Agent Status Behavior** — Sidebar agent light now blinks only while an enhance request is actively running. Availability remains solid blue when idle and dim gray when unavailable.
- **Profile Editor Model Visibility** — Added persistent footer indicator in the Profile editor showing the exact LLM used by the last enhancement run (`LLM used: <model>`).
- **Standards Editor Parity** — Rebuilt Standards view to match Profile editing workflow: detail/read view, markdown live editor, Save Over, Save as New, Delete, Enhance, Undo Enhance, and footer model indicator.

### API
- **Standard Enhancer Endpoint** — Added `POST /api/agents/enhancer/standard` with standard-specific frontmatter validation and the same embedding-ranked model routing/fallback strategy used by profile enhancement.
- **Standard Output Behavior Correction** — Removed rigid section-template enforcement. Enhancer now preserves model-driven body structure while normalizing required frontmatter defaults only.
- **Profile Enhancer Reliability Hardening** — Profile enhancement now supports body-only generation with preserved/normalized frontmatter to reduce `422` failures when models omit YAML blocks.
- **Standard Metadata Preservation Fix** — Standard enhancement now infers and preserves meaningful identity metadata (`id`, `title`, `description`) from existing content/heading/frontmatter instead of defaulting to generic `enhanced-standard` metadata.

### 2026-03-07 (Enhancer Agent: Profile Editor + Ollama)

### Features
- **First Named Agent (`enhancer`)** — Added `POST /api/agents/enhancer/profile` to run profile markdown enhancement through local Ollama models.
- **Profile Editor Enhance Action** — Added `Enhance` button in the Profile editor to submit current markdown and replace the editor with enhanced output.
- **Undo Enhancement** — Added one-click `Undo Enhance` to restore prior editor content snapshot.

### API / AI Runtime
- **Dynamic Model Routing** — Enhancer now uses `nomic-embed-text:latest` embeddings to rank models by input-context similarity across `llama3.2:latest`, `lfm2.5-thinking`, and `granite4`.
- **Speed-First Execution** — Router attempts the highest-ranked model first (typically `llama3.2:latest` on simpler profile edits), then retries with the next-ranked model when validation fails.
- **Fallback Reliability Fix** — Fallback retry now re-runs from the original user markdown input (with validation hints) instead of attempting to repair malformed model output.
- **Enhancer Validation Softening** — Auto-normalizes missing profile frontmatter defaults (`type`, `version`, fallback `name`/`description`) before model calls, and treats body-length checks as advisory warnings instead of hard failures.
- **Validation Contract** — Server now enforces Profile markdown requirements before returning enhancement output:
  - Required frontmatter fields: `id`, `type: profile`, `version`, `name|title`, `description`
  - Body guidance length is reported as advisory quality feedback

### Fixes
- **Profile Save Over / Editor Fidelity** — Profile API payload now includes `raw_content`, and the Profile editor loads existing profiles from raw file content for edits. This preserves full frontmatter fields (`type`, `version`, `standards`, etc.) instead of reconstructing a reduced header during edit/save cycles.
- **Enhance UX Reliability** — Removed blocking browser confirm from Profile `Enhance`, added explicit `ENHANCING...` status state, and now shows a clear completion message when enhancer returns unchanged content (prevents click from appearing to do nothing).

### 2026-03-07 (Root Documentation Synchronization)

### Documentation
- **`ARCHITECTURE_DESIGN.md` Alignment** — Updated UI Architecture module ordering to match the active app navigation (`Dashboard -> Profiles -> Standards -> Specifications -> Composer`), added current Specification **Full CRUD** capability, and included Workflows coverage.
- **Non-Goals Clarification** — Replaced ambiguous "Rich authoring CMS for standards" language with explicit "WYSIWYG authoring CMS (Markdown code-first preferred)" to match the implemented authoring model.
- **`SETUP_STEPS.md` Verification Refresh** — Updated UI verification checks to current terminology and behavior, including Dashboard core definitions and Composer dependency loading across profiles/standards/specifications/workflows.
- **`SETUP_STEPS.md` Numbering Fix** — Resolved duplicate section numbering by moving "Shutdown / Reset" to step `10`.
- **`README.md` Repository Map Cleanup** — Removed orphaned non-directory bullets and added missing `workflows/` directory entry for operational guidance artifacts.
- **Cross-File Consistency Check** — Confirmed `SESSION_CHAIN.md`, `SECURITY_GUARDRAILS.md`, `DIRECTIVES.md`, `BACKLOG_ENHANCEMENTS.md`, and existing `CHANGE_LOG.md` sections remain synchronized with current code behavior.

- **Directives Governance** — Established `DIRECTIVES.md` as the source of truth for session protocols (CD, Data Integrity, Token Efficiency).
- **CORS Resolution** — Centralized CORS management at the Nginx gateway; removed redundant Express middleware to fix header duplication and restore data visibility.

### 2026-03-07 (Development Directives & Data Visibility Fix)

### Operations & Governance
- **Session Directives** — Enforced in **`DIRECTIVES.md`** for mandatory redeployment, seed data verification, and token efficiency.
- **Documentation Synchronization** — Added `DIRECTIVES.md` rule ensuring all root-level `.md` files stay completely up to date.
- **Cross-Reference Update** — Updated root `.md` files to reference the new governance models and correct naming conventions.

### Fixes
- **CORS Header Duplication** — Resolved `'Access-Control-Allow-Origin: *, *'` error by removing redundant `cors()` middleware from the core engine. All fetch requests from UI (9090) to API (9092) now pass browser security checks.
- **Volume Re-initialization** — Reverted to named volumes and performed a full volume purge (`down -v`) to force-refresh seed data from the built images, ensuring non-zero stats on the Dashboard.

### 2026-03-07 (Terminology & Hierarchy Refinement)

### UI/UX Refinements
- **Terminology Rebranding** — Replaced instances of "Instructions" with **"Standards"** and "AI Profiles" with **"Profiles"**.
- **Hierarchical Framing** — Updated UI labels for Profiles, Standards, and Specifications.
- **Dashboard Refresh** — Reordered Profile/Standard cards, removed "trend" subtitles, and made Mission/Onboarding cards completely hidable via React state and local storage.
- **Composer Refinements** — Locked the Live Context viewer to 75% height for better overflow logic handling and completely removed the "Compare Previous" button to declutter. Allowed prompt compositional layers below it to scroll.
- **Prompt Composition Header** — Updated the injected heading string from `### ENGINEERING STANDARDS` to just `### STANDARDS`.

### Specification Management
- **Full Specification CRUD UI** — Implemented "Save New", "Save Over", and "Delete" for Specifications directly from the UI.
- **Specification State Hydration** — Editing an existing Specification now automatically hydrates its name into the Composer's save input, facilitating seamless updates.

---

### 2026-03-07 (Recovery & Asset Expansion)

### Fixes (Redeployment & Connectivity)
- **Critical Path Resolution** — Fixed `BASE_PATH` in the core engine to correctly resolve artifact libraries from the container root (`/usr/src/app` vs `/usr/src/app/core`).
- **Nginx Stream Sync** — Forced refresh of upstream IP mapping to resolve 502/Connection Refused errors between the API Gateway and the Core Engine.
- **Frontend Fallback Handling** — Updated `fetchItems` in `App.tsx` with `Promise.allSettled` and explicit error boundaries to ensure UI stability even if secondary services (like History) are unavailable.
- **Cache Invalidation** — Performed forced clean builds (`--no-cache`) to ensure the latest architectural fixes are active in the runtime images.

### Features (Asset Governance)
- **Workflows Tab** — Integrated "Workflows" as a new top-level asset category in the Sidebar and Dashboard.
- **Operational Sequence Indexing** — Engine now scans the `/workflows` directory for process-oriented instruction artifacts.
- **Version Awareness** — Introduced explicit platform versioning in the UI header for better state verification during development.

---

## 2026-03-07 (Architecture Maturity Refactor)

### Features (IDE & Tooling)

- **MCP Server Launch** — Released the **Model Context Protocol** server (`stdio`) that allows VS Code and Cursor agents to browse your library and compose context natively.
- **Artifact Linter** — Created a standalone validation suite used by the engine and upcoming CI pipelines to enforce artifact quality.

### Fixes & API Improvements

- **Type Safety Hardening** — Full interface refactor for `Artifact` and `NormalizedContext` to support the new metadata fields.
- **Loader Modernization** — Rebuilt artifact loaders to leverage the registry/manifest indexing.
- **Trace Output** — Rendered JSON payloads now include the sequence and lineage of every contributing artifact.

---

## 2026-03-07 (CRUD & Persistence Milestone)

### Features (Authoring & CRUD)

- **Full Profile CRUD** — Implemented complete Create, Read, Update, and Delete lifecycle for Role Profiles.
- **Durable Persistence** — Switched from bind mounts to named Docker volumes (`engagentic_profiles`, `engagentic_standards`, etc.) to ensure that all library edits made via the UI persist across container restarts and image rebuilds.
- **Markdown Editor Integration** — Replaced standard textarea with `@uiw/react-md-editor` featuring live side-by-side preview and syntax highlighting.
- **Differentiated Save Logic** — Added "Save Profile" (new), "Save Over" (update existing), and "Save as New" (fork/clone) actions to the authoring flow.
- **Auto-Navigation** — Editor now displays a "Saved" success state for 2 seconds before automatically returning to the Profile grid.

### UI/UX Refinements

- **Menu Realignment** — Swapped "Profile Architect" and "Standards Library" in the side navigation to align with the logical data hierarchy (Profiles -> Standards -> Specifications).
- **Editor Scaling** — Increased Profile editor height to 75% of the viewport (`75vh`) for better visibility of long prompt artifacts.
- **Refreshed Grid States** — `onRefresh` callbacks ensure that any CRUD operation (create/update/delete) immediately updates the library view without manual refresh.

### Fixes & API Improvements

- **Path Resolution Hardening** — `resolveArtifactPath` in the core engine now automatically ensures the `.md` extension is present, preventing writes to extensionless files.
- **Filename Sanitization** — Added `safeFilename` utility to generate web-safe filenames from display names.
- **Update Targeting** — Frontend now uses the actual file `path` instead of the internal `id` for `PUT` and `DELETE` requests, ensuring the correct filesystem target is always updated.

---

## 2026-03-07 (Initial Session)

### Documentation Expansion

- Reworked root `README.md` to reflect current service topology, runtime endpoints, and known behavior notes.
- Added `ARCHITECTURE_DESIGN.md` with implemented architecture and target direction.
- Added `SECURITY_GUARDRAILS.md` with threat model and baseline hardening controls.
- Added `BACKLOG_ENHANCEMENTS.md` with prioritized roadmap (`P0`-`P3`).
- Added `SETUP_STEPS.md` with local setup and troubleshooting runbook.
- Added `SESSION_CHAIN.md` with end-to-end composition and runtime flow.

### Recent Platform/UX Context (same development window)

- UI layout scaling updated for fuller viewport usage in desktop Chromium.
- API URL handling centralized in UI via `ui/src/lib/api.ts`.
- Root viewport constraints reinforced with explicit `html/body/#root` sizing.
- Added local Ollama runtime service `engagentic_ai` in `docker-compose.yml` with:
  - port `9094`
  - model preload bootstrap
  - persistent model volume
  - CPU cap (`10.0` CPUs)

### Fixes (same window)

- **CLI render contract fixed** — `isNormalizedContext()` type guard added to `/api/context/render`. Endpoint now detects pre-composed `NormalizedContext` payloads (from CLI pipe) and adapts directly without recomposition. Raw input bodies still trigger full composition. CLI `compose | render` pipeline is now fully deterministic.
- **Frontmatter fallback parser** — `parseArtifact` handles legacy files with heading before frontmatter. `normalizeArtifactMetadata` fills `name`, `title`, `description`, `category` from body when frontmatter is incomplete.
- **UI error surface** — `composeError` state in `Composer.tsx` surfaces engine errors to `PromptPreview` via `errorMessage` prop with a styled `preview-alert` block.
- **UI navigation wiring** — `onNavigateToDiff`, `onNavigateToComposer`, `onNavigate` callbacks wired through `App.tsx` to `Composer`, `Profiles`, `Specs`, `Standards`, and `Dashboard` to replace all `window.setActiveTab` hacks.
- **API URL centralization** — All UI fetch calls migrated to `apiUrl()` from `ui/src/lib/api.ts`.
- **Session count on Dashboard** — `App.tsx` fetches `/api/sessions` on mount; live count passed to `Dashboard` stat card.
- **Standards UI partition** — `ContextBuilder` renders Core and Community standards in separate labeled groups using `is_community` flag.
- **Community Standards Registry** — `standards-registry/` loaded and merged at engine startup; community standards tagged with `is_community: true`; official standards take precedence on ID collision.
- **Ollama runtime service** — `engagentic_ai` service added to `docker-compose.yml` on port `9094` with `ollama_data` volume and 10-CPU cap.
- **Template downloads** — `downloadProfileTemplate`, `downloadSpecTemplate`, `downloadStandardTemplate` wired to `New` buttons in respective library panels.
- **Dashboard onboarding** — 4-step onboarding card and glossary card added to `Dashboard`.

---

## Change Log Policy

Going forward:

- Append entries by date in descending order.
- Group by `Documentation`, `Features`, `Fixes`, `Security`, `Ops`.
- Keep only active caveats or explicit lessons-learned notes; remove superseded caveats.
