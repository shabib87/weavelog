---
id: TASK-85
title: Simplify task administration and make worktree progress visible
status: To Do
assignee: []
created_date: '2026-09-13 19:00'
labels:
  - harness
  - deferred
dependencies: []
references:
  - docs/trd/worktree-discipline.md
  - docs/prd/2026-09-05-v010-draft-brief.md
  - TASK-37
  - TASK-40
priority: low
type: enhancement
ordinal: 68000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Outcome: simplify task administration and make current worktree progress visible through the existing Backlog workflow. Creating or updating task metadata should not require an implementation worktree; one dashboard should show current task progress without manually changing its project directory; task history must remain Git-tracked while code-isolation and human approval gates remain intact.

Why: the current harness requires task creation/status updates in isolated worktrees, while a dashboard launched from main shows merged state. This makes planning administration costly and live progress difficult to see. Replacing TASK-45 with another Markdown tracker would reproduce the same storage/visibility problem.

Scope: the smallest change to task-administration rules/enforcement and Backlog visibility that meets these outcomes. Keep solution selection open at pickup; do not assume a new tracker product, synchronization service, storage format or automatic bypass. Reconcile the metadata/code boundary with the related deferred TASK-37 guardrail requirement; TASK-40 concerns task-ID allocation, not this complete outcome. Trace to NORTH_STAR small ships, minimal tooling, local-first state, evidence and human gates.

Deferral: a 0.1.1+ candidate only, not a promised version or a 0.1.0 release prerequisite. Revive after 0.1.0 ships, or earlier only if the author explicitly confirms that the interim workflow has demonstrably blocked an implementation task. Until then, main shows merged progress and the active task worktree shows live progress. No 0.1.0 task may acquire a dependency on this follow-up merely because it has been filed. Human spec/plan approval is required before activation.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 WHEN the documented task-administration workflow creates or updates a Backlog task THEN it does not require creating an implementation worktree solely for that metadata operation.
- [ ] #2 WHEN task progress differs between main and an active implementation worktree THEN one documented dashboard view presents current task identity, status and source without requiring the user to switch the dashboard between worktree directories.
- [ ] #3 WHEN task metadata is recorded through the supported workflow THEN its changes remain Git-tracked and recoverable without silently losing another task update or mixing unapproved code changes into metadata commits.
- [ ] #4 WHEN task administration is allowed by the revised rules THEN normal code-isolation, task-spec approval and human commit/merge gates remain enforced, with tests distinguishing permitted metadata operations from forbidden code changes.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Tests and lint pass with fresh output in the worktree
- [ ] #2 Worktree is clean (no uncommitted changes)
- [ ] #3 Branch is rebased on main and green
- [ ] #4 All acceptance criteria checked with fresh evidence (one at a time, never batched)
<!-- DOD:END -->
