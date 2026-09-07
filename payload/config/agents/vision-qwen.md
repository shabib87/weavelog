---
description: Vision gate on Qwen3.8-Flash — reads screenshots, images, PDFs, UI renderings, and diagrams to answer visual questions or verify visual output. Read-only; never edits files. Cheap default (TASK-75 ADR-004 roster); use vision-kimi for hard visual tasks.
mode: subagent
model: openrouter/qwen/qwen3.8-flash
prompt: "{file:./prompts/vision.md}"
steps: 30
permission:
  edit: deny
---
