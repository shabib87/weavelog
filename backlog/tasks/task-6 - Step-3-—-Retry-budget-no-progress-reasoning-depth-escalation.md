---
id: TASK-6
title: Step 3 — Retry budget + no-progress + reasoning-depth escalation
status: To Do
assignee: []
created_date: '2026-08-24 02:48'
updated_date: '2026-09-05 23:01'
labels: []
milestone: m-4
dependencies:
  - TASK-5
  - TASK-11
priority: medium
type: task
ordinal: 5000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Three caps (wall-clock, $, attempts), first wins. No-progress detector using session.diff event from SDK (not manual diff hashing) for diff-hash-unchanged check; session.error for transient-vs-capability classification. Tuple comparator (sorted failing test IDs + normalized error kind), unit-tested. Split retry counters (inner-loop vs kick-back). Reasoning-depth escalation: one reasoning_effort: high re-dispatch on capability failure (not transient), before abort+alert. Gate on reviewer-reported capability failures only. Trigger from Step 4 structured-output parser. Alert via `harness stuck <id>` CLI. Step 0 prerequisite: reasoning_effort wire value through headroom proxy verified.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Three caps implemented (wall-clock, $, attempts), first wins
- [ ] #2 No-progress detector uses session.diff event from SDK (not manual diff hashing)
- [ ] #3 session.error used for transient-vs-capability classification
- [ ] #4 Tuple comparator unit-tested (sorted failing test IDs + normalized error kind)
- [ ] #5 Split retry counters (inner-loop vs kick-back)
- [ ] #6 Reasoning-depth escalation: one reasoning_effort: high re-dispatch on capability failure
- [ ] #7 reasoning_effort wire value through headroom proxy verified (Step 0 prerequisite)
- [ ] #8 WHEN the driver dispatches a task THEN the conductor SHALL support a provisioned OpenRouter sub-key scoped to that task with a spending cap mapped to the task budget, such that a runaway agent is throttled at the cap instead of draining the primary key
- [ ] #9 WHEN any model request completes through the OpenRouter layer THEN per-request token and dollar cost SHALL be captured below the driver port and accumulated per task, independent of which agent runtime (opencode or pi) executed it
- [ ] #10 WHEN the conductor prepares a dispatch batch THEN it SHALL check remaining OpenRouter balance via the credits API and SHALL refuse to start new worktree batches when remaining budget is below a recorded floor
- [ ] #11 WHEN escalation or fallback routing is configured THEN the substrate design SHALL record which layer owns routing and fallback (OpenRouter provider routing vs headroom proxy) such that no double-fallback exists
- [ ] #12 WHEN the substrate design is recorded THEN it SHALL specify a cache-hit measurement method using OpenRouter usage breakdowns to verify headroom CCR effectiveness, replacing the pessimistic rule from TASK-3
- [ ] #13 WHEN the substrate layer is implemented THEN all of the above SHALL be wired below the driver port (driver-agnostic) and the design SHALL record a pi-inheritance check against TASK-19
<!-- AC:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: @conductor
created: 2026-09-05 16:57
---
Substrate layer scope added at grooming 2026-09-05: OpenRouter layer (cost telemetry, provisioned keys, credits gate, routing ownership, cache measurement) lives below the driver port, not inside the opencode driver. OpenRouter Agent SDK stays a supplement (in-conductor mini-loops only); opencode SDK remains primary for 0.1.0. pi wiring questions (model-string format) remain on TASK-19.
---
<!-- COMMENTS:END -->
