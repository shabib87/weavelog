---
description: Independent gate review of plans and specs on DeepSeek V4 Pro (L1 rung — same-family rechecks of deepseek-authored plans), BEFORE any implementation starts. Cross-model reviewer: deliberately NOT the same family as the default workhorse.
mode: subagent
model: openrouter/deepseek/deepseek-v4-pro-0813
prompt: "{file:./prompts/plan-reviewer.md}"
steps: 30
permission:
  edit: deny
---