---
id: TASK-7
title: Step 4 — Sequential per-AC review chain
status: To Do
assignee: []
created_date: '2026-08-24 02:48'
updated_date: '2026-09-05 23:01'
labels: []
milestone: m-4
dependencies:
  - TASK-6
  - TASK-11
priority: medium
type: task
ordinal: 6000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Sequential chain (not parallel): Reviewer 1 (logic, DeepSeek Pro) runs first → if FAIL, back to reasoning-depth escalation or worker → only if logic passes, Reviewer 2 (security, Qwen) runs. Per-AC rubric mode on reviewer-loop.ts (one verdict per AC). Structured output (json_schema) + parser + tests — build parser on --report <path> JSON output ({totalUsd, reviews:[{model, costUsd, content, usage}]}), not from zero. Classify: ERROR lines → transient (retry review); verdict FAIL → capability (escalate worker). Do NOT parse "STATUS: FAILED" (hallucinated). 3-family diversity: implementer GLM / logic reviewer DeepSeek Pro / security reviewer Qwen. Driver passes --models deepseek-v4-pro-0813,qwen3.8 explicitly. Assert family-disjointness at startup. DeepSeek V4 Pro 0813 — pin dated slug, reasoning_effort: max (or xhigh — equivalent per docs) at top level. --check-ac via task-flow.ts close for gate-pass transition. Per-task lifetime review budget (kick-backs re-fire: up to 3 firings). Rule: PASS but over-budget = FAIL.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Sequential chain: logic reviewer (DeepSeek Pro) first, security reviewer (Qwen) second
- [ ] #2 Per-AC rubric mode: one verdict per acceptance criterion
- [ ] #3 Structured output parser built on --report JSON, not from zero
- [ ] #4 ERROR lines → transient (retry); verdict FAIL → capability (escalate) — not STATUS: FAILED
- [ ] #5 3-family diversity: GLM implementer / DeepSeek logic / Qwen security
- [ ] #6 Family-disjointness asserted at startup (implementer family ∉ reviewer families)
- [ ] #7 DeepSeek V4 Pro 0813 slug pinned; reasoning_effort at top level (not inside provider: {})
- [ ] #8 --check-ac used via task-flow.ts close for gate-pass transition
- [ ] #9 Per-task lifetime review budget stated (up to 3 firings)
- [ ] #10 PASS but over-budget = FAIL rule enforced
<!-- AC:END -->
