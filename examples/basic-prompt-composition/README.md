# Basic Prompt Composition

This example demonstrates how to use the ENGAGEntic logic engine to compile a straightforward user task into a structured AI context package.

### Concepts
- Combining a **Profile** with a **Task**.
- Exporting the composed prompt via the UI or CLI.

### Usage (CLI)
You can directly compose this example using the command line tool:

```bash
cd ../../cli
npm run engagentic preview -- --profile engineering-assistant.md --task "Write a bubble sort algorithm in Python." --format openai
```

### Usage (UI Playground)
1. Open the Prompt Playground at `http://localhost:9090`.
2. Select **Engineering Assistant** as the Profile.
3. Type `"Write a bubble sort algorithm in Python"` into the User Task.
4. Watch the composed prompt assemble dynamically, and toggle the UI format selector to view the OpenAI or Anthropic message payload.
