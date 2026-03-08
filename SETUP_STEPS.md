# SETUP_STEPS

## Audience

Developers running ENGAGEntic locally using Docker Desktop.

## Prerequisites

- Docker Desktop installed and running
- Node.js 22+ (optional for running CLI outside containers)
- Available ports:
  - `9090` UI
  - `9091` core engine
  - `9092` API gateway
  - `9093` Postgres host mapping
  - `9094` Ollama runtime

## 1) Configure Environment

Create/update `.env` at repo root with Postgres values:

```env
POSTGRES_USER=engagentic
POSTGRES_PASSWORD=engagentic_dev_password
POSTGRES_DB=engagentic
DB_HOST=db
```

Optional service port overrides:

```env
UI_PORT=9090
APP_PORT=9091
API_PORT=9092
DB_PORT=9093
```

## 2) Build and Start Services

From repository root:

```bash
docker compose up -d --build
```

Verify containers:

```bash
docker compose ps
```

Expected services:

- `engagentic_ui`
- `engagentic_core`
- `engagentic_api`
- `engagentic_db`
- `engagentic_ai`

## 3) Verify Core Endpoints

```bash
curl http://localhost:9091/health
curl http://localhost:9092/api/standards
curl http://localhost:9092/api/profiles
curl http://localhost:9092/api/specifications
```

Validate seed baseline (required):

```bash
curl http://localhost:9092/api/profiles
```

Expected:

- At least one default profile is present (`engineering-assistant.md`).
- If missing, seed/bootstrap by reinitializing DB so `db/init/init.sql` runs again:

```bash
docker compose down -v
docker compose up -d --build
```

## 4) Verify UI

Open:

- `http://localhost:9090`

Basic checks:

- Dashboard loads artifact counts and core definitions.
- Profiles and Standards views render correctly.
- Composer fetches profiles/standards/specifications/workflows.

## 5) Verify Ollama Runtime

Check model tags:

```bash
curl http://localhost:9094/api/tags
```

Expected models (once pull completes):

- `nomic-embed-text:latest`
- `llama3.2:latest`
- `lfm2.5-thinking:latest`
- `granite4:latest`

## 6) Verify Enhancer Endpoint

```bash
curl -X POST http://localhost:9092/api/agents/enhancer/profile \
  -H "Content-Type: application/json" \
  -d '{"markdown":"---\nid: test-profile\ntype: profile\nversion: 1.0.0\nname: Test Profile\ndescription: Test.\n---\n\nYou are a concise engineering assistant."}'
```

Expected:

- `200` with JSON payload containing `enhanced_markdown`.
- Returned markdown includes frontmatter and profile body.

Verify standard enhancer:

```bash
curl -X POST http://localhost:9092/api/agents/enhancer/standard \
  -H "Content-Type: application/json" \
  -d '{"markdown":"---\nid: test-standard\ntype: standard\ntitle: Test Standard\ncategory: prompt-engineering\nversion: 1.0.0\ndescription: Test.\n---\n\n## Objective\nImprove reliability.\n\n## Standards\n- Be explicit.\n- Validate output."}'
```

Expected:

- `200` with JSON payload containing `enhanced_markdown`.
- On fresh restart, first enhancer call can fail during model warm-up; retry after Ollama bootstrap completes (`docker logs -f engagentic_ai`).

Watch bootstrap progress:

```bash
docker logs -f engagentic_ai
```

## 7) Optional: Run CLI

```bash
cd cli
npm install
npm run engagentic standards list
npm run engagentic compose -- --profile engineering-assistant.md --task "Assess architecture"
```

If needed:

```bash
API_URL=http://localhost:9092/api npm run engagentic standards list
```

## 8) Integrated Agent Workflow (MCP)

ENGAGEntic provides a Model Context Protocol server for direct integration into IDE agents (Cursor, VS Code, Claude Desktop).

### Setup in Cursor/VS Code:

1. Locate your IDE's MCP Configuration (usually in Settings -> Features -> MCP).
2. Add a new server:
   - **Name**: `ENGAGEntic`
   - **Type**: `command`
   - **Command**: `node`
   - **Arguments**:
     ```bash
     /absolute/path/to/ENGAGEntic/mcp/dist/index.js
     ```
   - **Environment Variables**:
     - `CORE_URL`: `http://localhost:9091`
     - `ENGAGENTIC_PATH`: `/absolute/path/to/ENGAGEntic`

### Capabilities Enabled:
- **Resources**: AI agents can browse your profiles and standards via `engagentic://artifacts/`.
- **Tools**: AI agents can call `compose_context` to build a professional prompt using your library from within the chat.

## 9) Development Governance

All active development sessions must adhere to the rules defined in **[DIRECTIVES.md](./DIRECTIVES.md)**. Key protocols include:
- Mandatory redeployment before validation after material changes.
- Automated seed data verification (minimum: default profile exists).
- Token efficiency in AI-agent communication.

## 10) Common Troubleshooting

### A) UI shows JSON parse error from `/api/*`

Cause:

- UI is hitting wrong base URL and receiving HTML.

Fix:

- Ensure UI uses `VITE_API_URL=http://localhost:9092/api`.
- Rebuild `ui` service.

### B) Ollama model pulls are slow or incomplete

Cause:

- Large model download time.

Fix:

- Keep container running and monitor `docker logs -f engagentic_ai`.

### C) Enhancer returns `422` validation errors

Cause:

- Submitted markdown is missing required profile frontmatter keys or body content is malformed.

Fix:

- Ensure input contains `id`, `type: profile`, `version`, `name|title`, and `description`, then retry.

### D) Enhancer appears to do nothing from UI

Cause:

- Ollama model(s) are unavailable or still pulling.

Fix:

- Verify `http://localhost:9094/api/tags` includes `nomic-embed-text:latest`, `llama3.2:latest`, `lfm2.5-thinking:latest`, `granite4:latest`.
- Check `engagentic_core` and `engagentic_ai` logs for enhancer request/response errors.

### E) Port conflicts

Cause:

- Existing local processes bound to 9090-9094.

Fix:

- Override ports in `.env` and restart compose.

## 11) Shutdown / Reset

Stop services:

```bash
docker compose down
```

Stop and remove volumes (destructive):

```bash
docker compose down -v
```
