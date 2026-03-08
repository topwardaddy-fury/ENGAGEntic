# Framework Agnostic CLI Integration

ENGAGEntic follows the Unix philosophy. It separates the **Composition** of AI Context from the **Rendering** of that logic into a specific AI Framework syntax.

This is what makes ENGAGEntic a truly framework-agnostic contextual engine.

### Usage: Pipeline Architecture

You can pipe the raw composed JSON blob directly into the renderer.

```bash
# Example: Compose context and pipe to the Anthropic renderer.
npm run engagentic compose \
  --profile engineering-assistant.md \
  --standards typescript-strict.md \
  --task "Build a new React context provider" \
| npm run engagentic render --format anthropic
```

### Supported Formats
- `openai`: Returns an array of `{ role, content }` objects mapped to system, developer, and user roles.
- `anthropic`: Returns a structured Anthropic `{ system, messages }` package.
- `generic`: Returns a mapped JSON object containing explicit `system_prompt`, `developer_prompt`, and `user_prompt` properties for custom APIs.
- `plain`: The monolith text prompt, useful for ChatGPT web clients.

### CI / CD Usage
Since the output is strictly structured, ENGAGEntic can be used inside GitHub Actions or GitLab pipelines to consistently generate prompt packages before testing GenAI applications.
