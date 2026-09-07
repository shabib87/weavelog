---
description: Independent gate review of plans and specs on Qwen3.8-2.4T-A95B (L3 rung — harness/orchestration plans, repeated rework failure), BEFORE any implementation starts. Cross-model reviewer: deliberately NOT the same family as the default workhorse.
mode: subagent
model: openrouter/qwen/qwen3.8-2.4t-a95b
prompt: "{file:./prompts/plan-reviewer.md}"
steps: 30
permission:
  edit: deny
---