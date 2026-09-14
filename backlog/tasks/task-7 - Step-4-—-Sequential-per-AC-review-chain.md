---
id: TASK-7
title: Repair shipped reviewer failure and cost reporting
status: To Do
assignee: []
created_date: '2026-08-24 02:48'
updated_date: '2026-09-13 17:10'
labels: []
milestone: m-4
dependencies:
  - TASK-11
priority: high
type: task
ordinal: 6000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Outcome: make the existing reviewer-loop.ts helper report invocation failures and estimated costs honestly before npm release. Why: the audit reproduced exit 0 when every reviewer failed, and retry usage undercounting that hid a threshold breach. Preserve the existing roster and independent review policy. TASK-4 owns the MVP TypeScript workflow through OpenCode; this standalone OpenRouter helper does not automatically load OpenCode agents, skills or hooks. Advanced per-AC review orchestration, multi-rung escalation and lifetime budgeting remain future work.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 WHEN any required reviewer request fails or yields no usable response after the allowed retry THEN the helper exits nonzero and records the failed reviewer in its report without exposing credentials.
- [ ] #2 WHEN a reviewer request is retried THEN the reported usage and estimated total include every billed attempt; the audit fixture costing 0.15 cannot report 0.05 or pass a 0.06 threshold.
- [ ] #3 IF catalog pricing or usage is unavailable THEN the report names the cost as unknown and does not claim a known zero cost or successful budget check.
- [ ] #4 WHEN the CLI describes or evaluates --budget-usd THEN it accurately states and tests its post-run estimated-cost threshold; it does not claim that checking after requests prevents spending.
- [ ] #5 WHEN verification runs THEN fake-provider tests cover failures, empty responses, retry accounting, missing cost data and successful reporting without live model spend; existing independent review and human approval remain required.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-09-13 audit reproduced the failures using memory-only fake fetch/auth/plan inputs, without network or credentials: all reviewers reject -> exit 0; first attempt 0.10 plus retry 0.05 -> reports 0.05 and exits 0 at threshold 0.06. Sources: src/tools/reviewer-loop.ts:150-179,183-192,219. Previous SDK-dependent sequential-review scope is deferred; revive it when one SDK dispatch exists and a demonstrated review failure requires it. The old TASK-6 dependency is unnecessary for this standalone repair.

2026-09-13 scope clarification: the bounded SDK controller now belongs in 0.1.0 under TASK-3/4/5. This task remains a standalone reviewer correctness repair. Do not infer native OpenCode agent, skill or hook integration from this helper's raw API requests.
<!-- SECTION:NOTES:END -->
