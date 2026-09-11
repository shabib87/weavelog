---
id: TASK-84
title: Synchronize restored MIT headers to live project copies
status: To Do
assignee: []
created_date: '2026-09-11 04:29'
labels: []
milestone: m-7
dependencies:
  - TASK-79
priority: high
type: task
ordinal: 67000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Outcome: synchronize the restored MIT license headers from the package source to known project-owned live copies. Why: repository restoration alone does not update an installed copy.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 WHEN synchronization runs THEN it verifies the inventory of seven project-owned live skill copies and updates only those copies through the supported synchronization path
- [ ] #2 WHEN synchronization completes THEN it records before-and-after header evidence and preserves third-party notices unchanged
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Tests and lint pass with fresh output in the worktree
- [ ] #2 Worktree is clean (no uncommitted changes)
- [ ] #3 Branch is rebased on main and green
- [ ] #4 All acceptance criteria checked with fresh evidence (one at a time, never batched)
<!-- DOD:END -->
