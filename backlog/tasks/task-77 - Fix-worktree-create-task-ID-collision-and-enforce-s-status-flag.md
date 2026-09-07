---
id: TASK-77
title: Fix worktree-create task-ID collision and enforce -s status flag
status: In Progress
assignee:
  - '@conductor'
created_date: '2026-09-07 22:45'
updated_date: '2026-09-07 22:46'
labels:
  - spec-approved
dependencies: []
ordinal: 61500
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Two harness gate bugs found during TASK-75. Bug 1: src/tools/worktree-create.ts inferNextTaskId picks max backlog ID + 1 without checking existing task branches/worktrees, so --create crashes when an unmerged task (TASK-76) holds the inferred ID — blocking ALL new task creation through the sanctioned path. Fix: skip IDs whose branch or worktree already exists. Bug 2: src/hooks/enforce.ts Hook 7 BACKLOG_STATUS_RE matches --status but not the short -s flag, so status changes slip past the main-branch gate (observed during TASK-75). Fix: match both flags. Files: src/tools/worktree-create.ts, src/hooks/enforce.ts, plus their tests.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 WHEN worktree-create --create infers the next task ID and a task branch or worktree with that ID already exists THEN the tool SHALL skip to the next free ID and create the worktree without collision
- [ ] #2 WHEN a backlog task edit carries a status change via either --status or -s THEN Hook 7 SHALL block it when the session branch is main and allow it on a task branch
- [ ] #3 IF the existing worktree-create and enforce-hooks test suites run THEN all existing cases SHALL pass except where the bug fix changes documented behavior
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Tests and lint pass with fresh output in the worktree
- [ ] #2 Worktree is clean (no uncommitted changes)
- [ ] #3 Branch is rebased on main and green
- [ ] #4 All acceptance criteria checked with fresh evidence (one at a time, never batched)
<!-- DOD:END -->
