---
id: TASK-83
title: Clear public repository and Git history for release
status: To Do
assignee: []
created_date: '2026-09-11 04:29'
labels: []
milestone: m-5
dependencies:
  - TASK-79
priority: high
type: task
ordinal: 66000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Outcome: independently clear the repository and every published Git ref for public release. Why: npm artifact safety does not prove that source history is safe to publish.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 WHEN the clearance runs THEN it audits the working tree and every Git ref for personal data, secrets, private paths, and licensing issues and records the scope and results
- [ ] #2 WHEN findings are resolved THEN three independent reviews confirm the public-source decision separately from TASK-54 npm artifact safety
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Tests and lint pass with fresh output in the worktree
- [ ] #2 Worktree is clean (no uncommitted changes)
- [ ] #3 Branch is rebased on main and green
- [ ] #4 All acceptance criteria checked with fresh evidence (one at a time, never batched)
<!-- DOD:END -->
