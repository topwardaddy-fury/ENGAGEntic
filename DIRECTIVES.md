# Development Session Directives

## 1. Continuous Deployment Protocol
* **Trigger:** Upon any **Material Change**—defined as a modification to logic, schema, configuration, or UI components that alters functional state.
* **Action:** Before any validation step (tests, manual verification, API checks, UI checks), execute the full redeployment or hot-reload sequence so validation always runs against the latest material change.
* **Constraint:** Do not batch multiple material changes; the environment must reflect the most recent codebase iteration before proceeding to subsequent tasks.

## 2. Data Integrity & Automated Seeding
* **Pre-Execution Validation:** Prior to testing or execution, verify active seed data is present.
* **Minimum Requirement:** There must always be at least one default profile (`engineering-assistant.md`) available.
* **Auto-Remediation:** If validation fails, re-run DB initialization by rebuilding the DB container and reinitializing the Postgres volume so `db/init/init.sql` is re-applied (the project does not currently provide a standalone `deploy seed data` script).

## 3. Token Efficiency & Success Prioritization
* **Objective:** Maximize the Information-to-Token ratio (high-density communication).
* **Methodology:** Eliminate conversational filler and redundant explanations. Use concise code blocks and shorthand where technical readability is maintained.
* **Hierarchy of Constraints:** **Task Success > Accuracy > Token Efficiency.** Never sacrifice functional correctness to save tokens; however, achieve success using the most direct logical path possible.

## 4. Version Synchronicity
* **Requirement:** Ensure all **Platform Version Strings** (e.g., `v0.2.2-stable`) are identical across the UI (headers, logos), API responses, and root Markdown documentation that explicitly references platform versioning.
* **Verification:** Before concluding a task, perform a case-sensitive grep for version identifiers to identify and resolve any drift.

## 5. Documentation Synchronization
* **Requirement:** Always keep the root-level `.md` documentation up-to-date after material changes (such as feature additions, architecture changes, or UI naming adjustments).
* **Action:** Before completing a material change request, verify and update `README.md`, `ARCHITECTURE_DESIGN.md`, `CHANGE_LOG.md`, `BACKLOG_ENHANCEMENTS.md`, and any other relevant root markdown files to reflect the new state of the system accurately.
