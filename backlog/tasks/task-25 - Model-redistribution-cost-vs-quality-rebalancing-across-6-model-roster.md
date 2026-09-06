---
id: TASK-25
title: 'Model redistribution: cost-vs-quality rebalancing across 6-model roster'
status: Done
assignee:
  - conductor
created_date: '2026-08-30 23:03'
updated_date: '2026-08-31 01:35'
labels: []
dependencies: []
ordinal: 17000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Reseach + redistribution proposal for the 6-model roster (glm-5.2, deepseek-v4-flash-0731, deepseek-v4-pro-0813, qwen3.8-2.4t-a95b, kimi-k3, minimax-m3) to maximize cost-vs-quality for THIS project. Grounded in: (1) real usage data mined from ~/.local/share/opencode/opencode.db (Aug 15-30 2026, ~$165 spend, per-role per-model cost/error/cache), (2) live OpenRouter pricing/endpoints (verify current $/M per provider, watch price drift vs stack-versions.json), (3) Aug-2026 open-weight benchmark evidence (Flash-0731 re-post-train vs GLM-5.2 vs qwen3.8 vs kimi-k3, incl. harness caveats). Output: dated research note in docs/research/ + concrete role->model re-assignment with expected cost delta. NO config changes in this task.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 WHEN the research note is written THEN it is dated, lives under docs/research/, and records the usage window, total spend, and per-model cost/token/error numbers mined from opencode.db
- [x] #2 WHEN the live pricing step runs THEN each roster model has a verified current $/M in/out/cache from the OpenRouter catalog and any drift vs stack-versions.json is called out
- [x] #3 WHEN the benchmark evidence step completes THEN each roster model is ranked by agentic-coding evidence for this project profile with vendor-vs-independent sourcing marked
- [x] #4 WHEN the redistribution proposal is drafted THEN every agent role (build/implementer/scout/researcher/reviewers/plan-gate/qa/escalation) maps to exactly one model with an estimated $ impact and no config edits made
- [x] #5 WHEN the task finishes THEN the proposed redistribution is reflected as a backlog plan with a defined trigger for the implementation task (config + runbook + AGENTS.md)
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Research-only task. Plan: (1) mine usage from opencode.db (Aug 15-30 window, per-model per-role cost/msgs/err/cache) — done; (2) verify live pricing via OpenRouter catalog + endpoints API, compare vs stack-versions.json doc — done; (3) gather Aug-2026 open-weight benchmark evidence for this project profile (Flash-0731 re-post-train vs GLM-5.2, vendor + independent sourcing) — done; (4) draft role->model redistribution with $ impact and guardrails — done; (5) record findings as dated research note under docs/research/ — done; (6) define trigger for implementation task (config + runbook + AGENTS.md + stack-check re-run). Implementation task TASK-26 deferred: trigger = this note APPROVED + merged.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Research complete. Final decision (captured in research note §0): shed to a 3-tier roster — deepseek/deepseek-v4-flash-0731 (bulk, $0.065/$0.18), z-ai/glm-5.3-flash (conductor+vision, $0.075/$0.25), deepseek/deepseek-v4-pro-0813 (review/escalation, $0.66/$1.98). Retire glm-5.2, qwen3.8, kimi-k3, minimax-m3. Closed-weight reviewed (GLM+Kimi consults) — no closed model earns a tier. Baseline: $165.16/16d. Prediction: $40-60/16d. Closed-weight verdict + all predictions in note. TASK-26 = apply routing + stale-doc sweep.

Cross-family review: qwen (APPROVE-WITH-NITS, fixed) → deepseek (REJECT-narrow, 10 findings all fixed → APPROVE-WITH-NITS, 4 NITs fixed). Roster now 5-tier: flash-0731 (bulk), glm-5.3-flash (conductor), v4-pro (review/qa), kimi-k3 (escalation, RECOMMENDED KEEP), minimax-m3 (vision, RECOMMENDED KEEP). Definite sheds: glm-5.2, qwen3.8. Prediction revised to $50-70/16d. kimi/minimax keep + grok-escalation head-to-head are the two open decisions for TASK-26 spec review.

FINAL review trail complete. qwen-family: APPROVE-WITH-NITS (fixed). deepseek-family: REJECT-narrow (10 findings, fixed) → APPROVE-WITH-NITS (4 NITs fixed) → APPROVE-WITH-NITS (pricing corrections: v4-pro 1.32/3.96, kimi 3.00/15.00 no-drop, reconciled) → APPROVE-WITH-NITS (final 2 nits fixed). Kimi-family consult: qwen re-scoped to high-stakes review (was wrongly shed). Final roster: 6 models — flash-0731 (bulk), glm-5.3-flash (conductor), v4-pro (review/qa), qwen3.8 (high-stakes review), kimi-k3 (escalation), minimax-m3 (vision). Shed: glm-5.2 only. Prediction: $165 → $55-75/16d. Baseline + all prices live-verified 2026-08-30.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Research complete and merged. Final roster: 6 models — flash-0731 (bulk/scout), glm-5.3-flash (conductor), v4-pro-0813 (review/qa), qwen3.8-2.4t-a95b (high-stakes review), kimi-k3 (escalation), minimax-m3 (vision). Shed: glm-5.2 only. Baseline: $165.16/16d (Aug 15-30 2026). Prediction: $55-75/16d (~55-67% cut). Review trail: qwen APPROVE, deepseek 4 rounds (REJECT-narrow→APPROVE×3), kimi consult. All prices live-verified 2026-08-30. Trigger for TASK-26: this merge. Open items for TASK-26 spec: grok-vs-kimi escalation head-to-head, v4-pro-vs-kimi executed benchmark, glm-5.3-flash dogfood.
<!-- SECTION:FINAL_SUMMARY:END -->
