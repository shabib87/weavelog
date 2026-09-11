---
id: TASK-55
title: Reproducible packaged enforcement adapters
status: In Progress
assignee:
  - '@conductor'
created_date: '2026-09-06 06:26'
updated_date: '2026-09-11 05:18'
labels:
  - spec-approved
milestone: m-7
dependencies:
  - TASK-58
  - TASK-59
  - TASK-79
priority: high
ordinal: 43000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Outcome: package and document adapters that load every required enforcement and verification gate from the installed weavelog package on the supported OpenCode profile. Why: source hooks alone do not prove that a user installation enforces policy; adapters must be reproducible and an intentional trip must prove each required gate is active.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 WHEN the supported profile is installed from the exact package THEN every required enforcement and verification adapter resolves from the installed package rather than a personal stale-path copy
- [ ] #2 WHEN each required gate is intentionally tripped THEN it loads, refuses or records the expected result, and produces auditable evidence
- [ ] #3 IF an adapter cannot resolve THEN doctor or check fails the supported profile with a named repair path; it does not silently fall back to a stale personal copy
- [ ] #4 WHEN configuration is reproduced on another supported profile THEN the same adapters and intentional gate trips pass from the documented portable instructions
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Tests and lint pass with fresh output in the worktree
- [ ] #2 Worktree is clean (no uncommitted changes)
- [ ] #3 Branch is rebased on main and green
- [ ] #4 All acceptance criteria checked with fresh evidence (one at a time, never batched)
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inventory every required OpenCode enforcement and verification gate, its intentional trigger, expected refusal/report, and audit receipt; explicitly exclude optional Headroom learning.
2. Add failing packed-artifact fixture tests for real emitted loaders, each required gate trip, audit receipts, unresolved/escaped helpers, stale personal-path non-fallback, and a second profile root.
3. Implement managed OpenCode loader emission, package-contained resolution and compiled-helper validation, safe doctor/check health inspection, and bounded JSONL audit receipts.
4. Add portable supported-profile instructions and repeat the isolated-package proof on two profile roots.
5. Run focused tests, full relevant verification, and Difit review; present the diff for human merge approval.
<!-- SECTION:PLAN:END -->
