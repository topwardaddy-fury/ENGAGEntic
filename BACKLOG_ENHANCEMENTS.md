# BACKLOG_ENHANCEMENTS

## Current Priority Backlog

This file is intentionally reset to a new baseline.
Previous backlog items were archived to:
- `BACKLOG_ENHANCEMENTS_ARCHIVE_2026-03-08.md`

## P0 (Immediate)

1. **MCP Specification Invocation via Docker Desktop MCP Toolkit**
   - Enable connected MCP clients (via Docker Desktop MCP toolkit) to directly call a Specification from ENGAGEntic.
   - Expose/extend MCP tool(s) to resolve a specification artifact and execute composition/render flow from that specification context.
   - Ensure this works through the existing `mcp/` server integration path and is verifiable from a connected MCP client session.

## P1 (Next)

1. **Scout Candidate Quality Scoring v2**
   - Current Scout baseline is implemented and active (health endpoint, lifecycle rules, UI status, purge/reseed control, ingestion pipeline).
   - Expand candidate ranking beyond stars with weighted scoring:
     - reusable guidance density
     - maintenance recency
     - contributor/release health
     - security quality indicators
   - Add explicit denylist/allowlist support for repo owners and patterns.
   - Add a minimum quality threshold so Scout may skip ingestion when no candidate meets standards.
   - Surface scoring rationale and skip reasons in Scout health telemetry for auditability.

## P2 (Mid-Term)

- _No items yet._

## P3 (Longer-Horizon)

- _No items yet._

## P4 (Workflow Track)

- _No items yet._

## Technical Debt Register

- _No items yet._

## Notes

- Add only currently relevant items.
- Move deprioritized items to the archive file instead of leaving stale entries here.
