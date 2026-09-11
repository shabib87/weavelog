---
id: TASK-55
title: Reproducible packaged enforcement adapters
status: To Do
assignee: []
created_date: '2026-09-06 06:26'
updated_date: '2026-09-11 04:05'
labels: []
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
