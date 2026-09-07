---
id: TASK-77
title: Fix worktree-create task-ID collision and enforce -s status flag
status: In Progress
assignee:
  - '@conductor'
created_date: '2026-09-07 22:45'
updated_date: '2026-09-07 23:02'
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
- [x] #1 WHEN worktree-create --create infers the next task ID and a task branch or worktree with that ID already exists THEN the tool SHALL skip to the next free ID and create the worktree without collision
- [x] #2 WHEN a backlog task edit carries a status change via either --status or -s THEN Hook 7 SHALL block it when the session branch is main and allow it on a task branch
- [ ] #3 IF the existing worktree-create and enforce-hooks test suites run THEN all existing cases SHALL pass except where the bug fix changes documented behavior
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
AC#1 verified: two new --create mode tests (real git branch collision + worktree-dir collision in temp repos) pass; live dry-run against the real repo with the fixed binary skipped TASK-76 (unmerged branch) and TASK-77 (this task) and inferred TASK-78. AC#2 verified: three new Hook 7 tests (-s blocked on main; --label + -s combined blocked on main; -s allowed on task branch) pass. AC#3: full suite 639 pass / 0 fail / 1 pre-existing skip (dist build absent); biome + tsc clean.

L3 review (diff-reviewer-qwen) APPROVE-WITH-FIXES; dispositions applied: glued -s"..." form now caught (reviewer verified backlog 1.50.1 accepts glued short flags), 50-candidate scan exhaustion covered by test, stale comment merged, documented over-block for quoted " -s " in command text (fail-closed, main-only).
<!-- SECTION:NOTES:END -->
