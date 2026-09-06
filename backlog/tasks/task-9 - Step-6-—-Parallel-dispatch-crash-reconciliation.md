---
id: TASK-9
title: Step 6 — Parallel dispatch + crash reconciliation
status: To Do
assignee: []
created_date: '2026-08-24 02:48'
updated_date: '2026-09-05 23:01'
labels: []
milestone: m-4
dependencies:
  - TASK-8
  - TASK-11
priority: medium
type: task
ordinal: 8000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Multiple eligible tasks dispatched at once. Reconcile-on-startup (pessimistic: unknown counter = ceiling, unknown $ used = ceiling, unknown dispatch_id = orphan from git worktree list). Orphan worktree detection (legacy exclusion rule for the 2 existing worktrees: deny-glob-source-of-truth, deterministic-harness-research). Mid-run backlog drift re-verify before dispatch and before merge (task may have been human-moved). Merge serialization order for parallel approvals. onStatusChange as primary event channel for human-initiated status drift (replaces polling); re-verify as belt-and-braces.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Multiple eligible tasks dispatched in parallel
- [ ] #2 Reconcile-on-startup: pessimistic crash semantics (unknown counter = ceiling)
- [ ] #3 Orphan worktree detection with legacy exclusion rule for 2 existing worktrees
- [ ] #4 Mid-run backlog drift re-verify before dispatch and before merge
- [ ] #5 Merge serialization order for parallel approvals defined
- [ ] #6 onStatusChange as primary event channel for status drift; re-verify as belt-and-braces
<!-- AC:END -->
