---
id: TASK-40
title: >-
  Fix worktree-create.ts inferNextTaskId — ignores tasks committed on other
  branches, mislabels worktree (TASK-37 collision -> TASK-38)
status: To Do
assignee: []
created_date: '2026-09-04 19:35'
updated_date: '2026-09-11 04:02'
labels:
  - harness
dependencies:
  - TASK-59
priority: high
type: bug
ordinal: 30500
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
worktree-create.ts --create infers the next task ID via `backlog task list --json` from the currently checked-out working copy (repo root = main), which only sees task files present on the current branch. Task files committed on OTHER branches are invisible — e.g. task-37 (Intercept backlog CLI and bash writes on main — enforce.ts blind spot, deferred) is committed on branch task/TASK-36. Reproduce: run `bun ~/.agents/bin/src/worktree-create.ts --create <title>` while main has max task-36; inferNextTaskId returns TASK-37 (stale), but `backlog task create` inside the new worktree correctly assigns the next free ID (TASK-38). The script then names the worktree dir, branch, and TASK.md with the STALE inferred id (TASK-37) while the backlog task is TASK-38 — a permanent mismatch (worktree .worktrees/TASK-37, branch task/TASK-37, TASK.md says TASK-37, actual task is TASK-38). Hit live on 2026-09-03 while creating TASK-38; conductor worked around by renaming the branch and moving the worktree. Intermittent: only fires when another branch holds the next N+1 task id. Fix direction: inferNextTaskId must scan ids committed on ALL branches (git ls-tree across refs/heads), not just the local working copy; optionally rename the worktree/branch/TASK.md to the final id backlog task create returns (the script already parses the created id via createTaskFromWorktree — propagate it to the worktree naming when it differs).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 WHEN worktree-create.ts --create runs and another branch holds a task id equal to the locally-inferred next id THEN the created worktree, branch, and TASK.md are named with the FINAL id that backlog task create actually returns (mirror of the TASK-37/TASK-38 collision)
- [ ] #2 WHEN inferNextTaskId runs THEN it accounts for task ids committed on ALL local branches (git ls-tree refs/heads), not just the checked-out working copy
- [ ] #3 WHEN the fix lands THEN a regression test reproduces the collision (a task-N committed on a second branch) and asserts the worktree/branch/TASK.md match the backlog-created id
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-09-11 correction: Worktree ID-collision repair remains future harness maintenance; clear m-7 because it is not a 0.1 release blocker. TASK-77 is the suspected duplicate and must be compared before either is closed.
<!-- SECTION:NOTES:END -->
