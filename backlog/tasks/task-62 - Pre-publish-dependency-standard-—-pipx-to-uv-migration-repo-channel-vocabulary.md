---
id: TASK-62
title: Portable dependency configuration — preserve personal migration separately
status: To Do
assignee: []
created_date: '2026-09-06 20:06'
updated_date: '2026-09-11 04:00'
labels:
  - harness
milestone: m-7
dependencies:
  - TASK-59
  - TASK-68
  - TASK-66
  - TASK-79
priority: high
ordinal: 50000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Outcome: make the shipped dependency channel and manifest portable and reproducible without changing a developer's personal installations. Why: a supported package cannot depend on a particular pipx layout, but removing personal pipx environments is separate opt-in maintenance.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 WHEN repository configuration is reconciled THEN portable dependency channels and manifest requirements are documented and tested without requiring a personal-machine uninstall
- [ ] #2 IF a live pipx migration is proposed THEN it is separate work with explicit human approval and does not block v0.1.0
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
2026-09-06 cross-thread reconciliation: closure-set AC updated to explicit IDs (canonical set {53,54,56,62,63,64,66,67} recorded in the TASK-45 pointer note; mechanical enumeration owned by the publish-gate CI). ORDERING: TASK-66 (doctor/check clean-machine fix) lands BEFORE this ticket closes — re-run doctor-exit-0 evidence after TASK-66 merges.

2026-09-06 DAG integration: hard edge on TASK-68 added — the headroom proxy plist argv changes there first (--no-memory-tools), this migration then preserves that argv byte-identically.

2026-09-10 correction: personal pipx removal and live migration are deferred. This task retains only portable configuration and reproducible channel requirements.
<!-- SECTION:NOTES:END -->
