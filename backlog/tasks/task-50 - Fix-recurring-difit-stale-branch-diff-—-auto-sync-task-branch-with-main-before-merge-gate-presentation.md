---
id: TASK-50
title: >-
  Fix recurring difit stale-branch diff — auto-sync task branch with main before
  merge-gate presentation
status: To Do
assignee: []
created_date: '2026-09-05 17:12'
updated_date: '2026-09-11 04:02'
labels: []
dependencies:
  - TASK-59
priority: medium
type: bug
ordinal: 39000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Recurring merge-gate presentation defect (incident 2026-09-04, recurred 2026-09-05 twice): the conductor opens difit against a task branch whose base predates recent main merges, so difit renders unrelated files (e.g. tasks merged to main after the branch was cut) as DELETIONS. The human sees a misleading +N/-M diff and must be told the deletions are a display artifact — every time. Root cause is process: syncing the branch with main before presentation relies on conductor memory. Fix: automate the pre-sync (merge main into the task branch) as part of the difit presentation step, and record it in worktree-discipline.md (the single source) next to the existing branch-first invocation-direction note.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 WHEN the conductor opens difit for a merge gate THEN the task branch SHALL first be synced with main (merge main into the branch) so the presented diff contains only changes belonging to the task
- [ ] #2 WHEN the pre-sync runs THEN it SHALL be automated (script step in the presentation flow, e.g. worktree-create.ts extension or a difit wrapper), not a remembered manual step
- [ ] #3 IF the sync merge hits conflicts THEN they SHALL be surfaced and resolved BEFORE difit opens, never presented as part of the gate diff
- [ ] #4 WHEN worktree-discipline.md is updated THEN the difit auto-open section SHALL record the pre-sync step alongside the branch-first invocation-direction rule
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-09-11 correction: Difit stale-branch repair remains future merge-harness work; clear m-7 because it is not a release blocker.
<!-- SECTION:NOTES:END -->
