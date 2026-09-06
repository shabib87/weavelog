---
id: TASK-43
title: >-
  Clarify litellm pricing-bridge scope in sync-model-pricing.ts + reference
  research
status: To Do
assignee: []
created_date: '2026-09-05 05:24'
updated_date: '2026-09-05 16:57'
labels: []
dependencies:
  - TASK-26
references:
  - docs/research/2026-09-05-openrouter-pricing-litellm-headroom-hooks.md
ordinal: 33000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Research (2026-09-05) resolved that in our live stack litellm is used by headroom EXCLUSIVELY as a pricing database (litellm.model_cost / cost_per_token) — NOT for routing, proxy backend, or token counting. Our sync-model-pricing.ts is the OpenRouter->litellm price bridge so headroom dollar savings don't read $0.00 for newer models. The research also identified the proper durable fix: a headroom proxy extension calling litellm.register_model(model_cost=...) at startup, which survives pipx upgrades (unlike editing the bundled backup JSON, which upgrades wipe).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 sync-model-pricing.ts top doc comment states litellm's actual scope in our stack: pricing cost-map only, not routing/proxy/token-counting
- [ ] #2 Comment references docs/research/2026-09-05-openrouter-pricing-litellm-headroom-hooks.md
- [ ] #3 Comment documents register_model-at-startup as the upgrade-proof proper fix (prototype/verify) vs the current file-patch, and notes the weekly --check drift guard stays regardless
- [ ] #4 bun test passes in ~/.agents/bin and biome check is clean
- [ ] #5 WHEN the pricing-bridge scope is clarified THEN OpenRouter GET /api/v1/models live pricing SHALL be evaluated as the alternative source to the litellm bridge (same existing auth, fresher data, one fewer dependency), and the decision SHALL be recorded with rationale
<!-- AC:END -->
