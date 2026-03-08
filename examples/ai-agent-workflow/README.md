# AI Agent Workflow Instructions

This directory demonstrates how ENGAGEntic handles **autonomous agent guidance**.

Instead of embedding step-by-step reasoning logic into an ad-hoc prompt, you attach a **Workflow**. The engine integrates the sequential steps into the developer context, guiding models like `gpt-4o` or `claude-3.5-sonnet` on how to navigate the current execution phase.

### Try It Out

```bash
# Add workflow guidance to your context mix
npm run engagentic preview \
    --profile agent-supervisor \
    --workflow react-sprint-workflow.md \
    --task "Initiate Phase 1 of the auth service rewrite" \
    --format anthropic
```

By exporting to `anthropic`, the workflow steps are embedded directly into the master `system` payload sent to the API.
