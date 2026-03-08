# SESSION_CHAIN

## Purpose

This document defines the lifecycle chain of an ENGAGEntic context session from authoring inputs to downstream AI execution.

## Session Chain (Current State)

```text
Discovery (Post-build/Startup)
    -> Registry Manifest Generation
    -> Validation (Artifact Linting)
Author Inputs (UI/CLI/MCP)
    -> Optional Agent Transform (Profile/Standard Enhancer)
    -> Optional Community Lifecycle Action (Community purge -> Scout refill)
    -> Artifact Resolution (Registry lookup)
    -> Dependency Expansion (Recursive Inheritance & Includes)
    -> Normalization (Canonical contract assembly)
    -> Adapter Dispatch (to OpenAI/Anthropic/Plain/Generic/JSON)
    -> Session Persistence (Postgres)
    -> Consumer Execution (VS Code / Agent / Local Ollama)

Governance Constraint (All Stages):
    -> Compliance Verification (via [DIRECTIVES.md](./DIRECTIVES.md))
```

## Stage 1: Discovery & Indexing

- **Boot Sequence**: Engine scans all asset directories.
- **Manifest**: Generates `artifact_manifest.json` as the unified index.
- **Validation**: `ArtifactValidator` checks for schema errors and broken lineages.

## Stage 2: Input Capture

Input channels:

- UI Context Composer
- MCP Tools (`compose_context`, `render_context`)
- CLI Chaining
- Direct REST API

## Stage 3: Optional Agent Transform (Profile/Standard Enhancer)

- Endpoint: `POST /api/agents/enhancer/profile`
- Endpoint: `POST /api/agents/enhancer/standard`
- Input: current profile/standard markdown from respective editor.
- Runtime: local Ollama (`engagentic_ai`) with embedding-assisted model routing.
- Output: validated markdown (frontmatter + body) returned to the editor.
- Recovery:
  - If top-ranked generation model output fails validation, enhancer retries with the next-ranked model.
  - Validation errors are surfaced back to UI without mutating editor content.

## Stage 3B: Community Lifecycle Controls (Scout)

- Endpoint: `POST /api/community/purge`
- Action: Removes Community Profiles, Community Standards, and Community Specifications.
- Follow-up: Triggers Scout to refill to target count.
- UI integration: Dashboard Scout card includes purge action to execute this lifecycle reset.

## Stage 4: Hierarchical Expansion

ENGAGEntic now supports recursive artifact resolution:

- **Profile Inheritance**: Resolves `extends` link (e.g., `Senior` -> `Baseline`).
- **Shared Inclusion**: Resolves `includes` arrays for cross-cutting standards.
- **Loop Protection**: Circular references are caught and blocked during expansion.

## Stage 5: Context Normalization

Normalization outputs enriched with tracing data:

- `system_prompt` / `developer_prompt` / `user_prompt`
- `artifact_lineage`: Detailed ID path of all contributors.
- `composition_trace`: Log of inheritance and inclusion steps.
- `artifact_versions`: Checksum/version snapshot of the session state.

## Stage 6: Adapter Rendering (Plugin System)

Render logic is dispatched to specialized plugins:

- `openai`: message array
- `anthropic`: system/messages
- `plain`: monolithic text
- `generic`: multi-role prompt object

## Stage 7: Persistence

- **Artifacts**: DTM-backed named volumes for permanent asset storage.
- **Sessions**: Postgres-backed history of composed prompts.
- **Observability**: Every session stores its registry version and lineage.

## Stage 8: Execution Runtime Chain

- **Agentic**: MCP allows IDE agents (Cursor/VS Code) to browse and compose context.
- **Local**: `engagentic_ai` (Ollama) handles the inference of the rendered prompt.

## Stage 9: Editor Persist (Profile + Standard CRUD)

- **Save Over** writes the current editor `raw_content` to the existing profile/standard path.
- **Save as New** forks content into a new profile/standard artifact.
- Editors load from stored `raw_content` to preserve full frontmatter fidelity on round-trip edits.

## Failure Chain and Recovery

### Failure point: Broken Lineage

- Symptom: artifact extends or includes a non-existent ID.
- Recovery: registry check at startup reports "Unknown ID" warnings.

### Failure point: Circular Dependency

- Symptom: infinite recursion during composition.
- Recovery: recursion depth guard throws clear "Circular Dependency Detected" error.

### Failure point: Frontmatter Mismatch

- Symptom: artifact fails validation due to missing required fields.
- Recovery: CLI linter or server log pinpoint the specific file and field.

### Failure point: Enhancer Output Validation Failure

- Symptom: enhancer returns malformed markdown or incomplete frontmatter/body.
- Recovery: enhancer retries on fallback model and returns explicit validation errors if still invalid.

### Failure point: Low-Quality Community Candidate Selection

- Symptom: Scout selects repositories that are popular but not reusable for ongoing library value.
- Recovery: Scout guardrails enforce reusable-content signals and block one-time setup/install/onboarding-oriented candidates before ingestion.

## Session Chain Maturity Targets

1. ~~Deterministic composition independent of persistence.~~ ✅ **DONE**
2. ~~Validated schema boundary on all chain hops.~~ ✅ **DONE**
3. ~~Recursive inheritance and cross-artifact dependency support.~~ ✅ **DONE**
4. Provider/runtime abstraction for local and remote AI execution.
5. OTel telemetry for composition pipeline performance.
