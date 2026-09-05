---
description: Independent implementation/diff reviewer on Qwen3.8-2.4T-A95B. Fresh context, never inherits the implementer's history. Cross-family error diversity is intentional.
mode: subagent
model: openrouter/qwen/qwen3.8-2.4t-a95b
prompt: "{file:./prompts/reviewer.md}"
steps: 30
permission:
  edit: deny
---