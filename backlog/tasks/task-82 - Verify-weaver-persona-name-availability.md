---
id: TASK-82
title: Verify weaver persona name availability
status: To Do
assignee: []
created_date: '2026-09-11 04:29'
labels: []
milestone: m-4
dependencies:
  - TASK-79
priority: high
type: spike
ordinal: 65000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Outcome: establish whether the proposed weaver persona name is available before any persona artifacts are created. Why: a collision would make the command architecture unsafe to ship.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 WHEN the availability check completes THEN it records dated npm, GitHub, domain, and trademark search evidence and asks the human to approve or reject the name before TASK-80 begins
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Tests and lint pass with fresh output in the worktree
- [ ] #2 Worktree is clean (no uncommitted changes)
- [ ] #3 Branch is rebased on main and green
- [ ] #4 All acceptance criteria checked with fresh evidence (one at a time, never batched)
<!-- DOD:END -->
