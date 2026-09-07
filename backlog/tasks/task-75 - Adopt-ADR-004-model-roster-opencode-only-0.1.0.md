---
id: TASK-75
title: >-
  Adopt ADR-004 model roster — opencode host only (0.1.0): payload
  opencode.jsonc + agents, escalation ladder wiring, monthly cadence,
  static cache-discount pull
status: To Do
assignee: []
created_date: '2026-09-07 20:30'
updated_date: '2026-09-07 20:30'
labels: []
milestone: m-7
dependencies:
  - TASK-61
references:
  - 'docs/architecture/adr/0004-model-selection-benchmark-policy.md'
  - 'docs/research/2026-09-07-flagship-tier-pricing-quality-preliminary.md'
priority: high
type: task
ordinal: 50000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Phase-2 static adoption of the TASK-61 evidence base (ADR-004, living
policy). HOST SCOPE: weavelog 0.1.0 targets the opencode host ONLY —
`payload/config/opencode.jsonc` + `payload/config/agents/*`. Pi host config
changes (models.md, settings.json) are explicitly deferred to 0.2.0 and out
of scope here. Provider pin: OpenRouter primary until 0.2.0+.

Roster (7 models): pro tier = deepseek-v4-pro-0813, glm-5.3,
qwen3.8-2.4t-a95b, kimi-k3; fast tier = deepseek-v4-flash-0731,
glm-5.3-flash, qwen3.8-flash. Conductor/default = glm-5.3-flash; bulk
worker = deepseek-v4-flash-0731; vision/UI = qwen3.8-flash (replaces
vision-deepseek vision-exp and vision-minimax). Access removed: minimax-m3,
deepseek-v4-flash-vision-exp (already out: qwen3.8-max, glm-5.2).

Escalation ladder (ADR-004): L0 glm-5.3-flash -> L1 deepseek-v4-pro
(risk-signal triggers, no line count) -> L2 glm-5.3 -> L3 qwen3.8-2.4t ->
L4 kimi-k3; relational family rule (family = vendor; final approval from a
different vendor than the maker).

Cadence wiring: pinned OpenRouter `/api/v1/models` snapshot in repo; weekly
stack-check gate (>=10% price delta on roster models, new slug in monitored
families z-ai/deepseek/qwen/moonshotai, removed/renamed slug) with bounded
auto-select (ledger-logged, reversible only) and blocking human decision
brief for structural changes; MONTHLY deep refresh replaces the quarterly
protocol in model-routing.md. ADR-004 is never edited by the script.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 WHEN payload config is adopted THEN opencode.jsonc and agent files SHALL reflect the 7-model roster with access removed for minimax-m3 and deepseek-v4-flash-vision-exp, and no reference to retired qwen3.8-max/glm-5.2 as active seats
- [ ] #2 WHEN the escalation ladder is wired THEN reviewer/plan-gate agents SHALL carry L0-L4 trigger semantics with risk-signal detection computed on the merged diff against base, and the relational family rule enforced for final approval
- [ ] #3 WHEN the drift gate is wired THEN a pinned OpenRouter snapshot SHALL live in the repo and stack-check SHALL fail on >=10% roster price delta, new monitored-family slug, or removed/renamed roster slug, generating a blocking human decision brief
- [ ] #4 WHEN cadence is updated THEN model-routing.md SHALL specify MONTHLY deep refresh (superseding quarterly) and the bounded auto-select ledger format
- [ ] #5 IF provider cache discounts are pulled THEN Baseten/DeepInfra/NovitaAI/SiliconFlow published cache read/write rates SHALL be captured as static card facts in the research note (Phase-2 step one; not runtime telemetry)
- [ ] #6 WHEN diff review closes THEN the human SHALL approve the diff (HITL gate); sanitization scan passes before merge
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Biome and tsc pass with fresh output in the worktree
- [ ] #2 Worktree is clean (no uncommitted changes)
- [ ] #3 Branch is rebased on main and green
- [ ] #4 All acceptance criteria checked with fresh evidence (one at a time, never batched)
- [ ] #5 Sanitization scan passes (no absolute home paths, no secrets)
- [ ] #6 Small reversible diff; config-only, zero logic changes outside declared tools
<!-- DOD:END -->
