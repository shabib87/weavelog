---
description: Vision gate on MiniMax-M3 — reads screenshots, images, PDFs, UI renderings, and diagrams to answer visual questions or verify visual output. Read-only; never edits files. Cheap default; use vision-kimi for hard visual tasks.
mode: subagent
model: openrouter/minimax/minimax-m3
prompt: "{file:./prompts/vision.md}"
steps: 30
permission:
  edit: deny
---