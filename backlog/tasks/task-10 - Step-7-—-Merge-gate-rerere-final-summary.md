---
id: TASK-10
title: Step 7 — Merge gate + rerere + final-summary
status: To Do
assignee: []
created_date: '2026-08-24 02:48'
updated_date: '2026-09-05 23:01'
labels: []
milestone: m-4
dependencies:
  - TASK-9
  - TASK-11
priority: medium
type: task
ordinal: 9000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Re-rebase immediately before `git merge` (main can move between approval and merge under parallel dispatch). Clean-merge path → Done + merged label, delete worktree, re-run eligibility. --final-summary: write PR-style completion notes at merge time (merge SHA, cost, reviewer verdicts) via `task edit --final-summary`. Conflict → bail to human, honest diagnosis (DAG-wrong OR hot-file contention); use --modified-files to trace which files each task touched. git rerere as one config line. Restart-after-merge discipline for self-updating merges (driver restarts from new HEAD after touching bin/src/ paths). Whole workflow done when every task reaches Done + merged.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Re-rebase immediately before git merge
- [ ] #2 Clean-merge path: Done + merged label, delete worktree, re-run eligibility
- [ ] #3 --final-summary written at merge time (merge SHA, cost, reviewer verdicts)
- [ ] #4 Conflict → bail to human with honest diagnosis (DAG-wrong OR hot-file contention)
- [ ] #5 --modified-files used for conflict file traceability
- [ ] #6 git rerere enabled as one config line
- [ ] #7 Restart-after-merge discipline for self-updating merges (bin/src/ paths)
- [ ] #8 Whole workflow completes when every task in DAG reaches Done + merged
<!-- AC:END -->
