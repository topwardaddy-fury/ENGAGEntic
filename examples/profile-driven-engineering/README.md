# Profile-Driven Engineering Context

This example demonstrates how an entire engineering environment can be loaded automatically by assigning a **Profile**. 

Instead of copying and pasting the same rules to the LLM every time (e.g. "You are an expert React developer, use strict TypeScript..."), you encapsulate these baseline rules into a Profile. Multiple sessions can inherit the same Profile.

### Try It Out

```bash
# Preview how the engineering assistant profile configures the session
npm run engagentic preview -- --profile engineering-assistant.md --task "Review the architecture and identify single points of failure" --format generic
```

The `generic` format will structure the output with explicit `system_prompt` and `developer_prompt` keys, perfect for piping into custom inference engines.
