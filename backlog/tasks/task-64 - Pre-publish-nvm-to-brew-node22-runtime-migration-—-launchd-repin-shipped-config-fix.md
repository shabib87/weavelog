---
id: TASK-64
title: Portable Node configuration — preserve personal migration separately
status: To Do
assignee: []
created_date: '2026-09-06 20:06'
updated_date: '2026-09-11 04:00'
labels:
  - harness
milestone: m-7
dependencies:
  - TASK-59
  - TASK-66
  - TASK-79
priority: high
ordinal: 52000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Outcome: remove machine-specific Node paths from shipped configuration and document a reproducible supported runtime check. Why: a package user must not inherit an author's nvm layout, while removing a personal nvm installation is separate opt-in maintenance.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 WHEN shipped configuration is reconciled THEN it uses portable Node runtime paths and has a reproducible supported-profile check
- [ ] #2 IF a live nvm removal is proposed THEN it is separate work with explicit human approval and does not block v0.1.0
- [ ] #3 WHEN this task completes THEN tests, typecheck, formatting, doctor, and check pass with no committed absolute home paths
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Tests and lint pass with fresh output in the worktree
- [ ] #2 Worktree is clean (no uncommitted changes)
- [ ] #3 Branch is rebased on main and green
- [ ] #4 All acceptance criteria checked with fresh evidence (one at a time, never batched)
<!-- DOD:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-09-06 cross-thread reconciliation: closure-set AC now explicit IDs. ORDERING: TASK-66 (doctor/check clean-machine fix) lands BEFORE this ticket closes — the doctor node-path-guard evidence in AC#2 must be re-run after TASK-66 merges; TASK-67 stranger battery provisions brew node@22 and must observe this ticket stale-alias trap (version-check, not existence).

2026-09-10 correction: personal nvm removal is deferred. This task retains portable runtime configuration and reproducibility only.
<!-- SECTION:NOTES:END -->
