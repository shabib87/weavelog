---
id: TASK-91
title: Privacy sweep — clear real-name identifiers and narrow repo excludes
status: To Do
assignee: []
created_date: '2026-09-20 08:08'
labels: []
dependencies:
  - TASK-73
  - TASK-83
ordinal: 73000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Outcome: after TASK-73 externalized the privacy needles and shipped excludes, run a one-time sweep that finds and resolves the real-name identifiers still present in the working tree, then narrows the temporary repo-local excludes. Why: TASK-73 removed the chicken-and-egg from the shipped gate (no personal literal in code/tests/package), but the repository still contains the author real-name variants, machine home paths, and personal email in provenance surfaces; TASK-83 owns the public working-tree and all-refs clearance decision, so this task produces the findings and the corrected working tree it needs. Boundary: does not decide history rewrite vs accept (TASK-83), does not touch attribution surfaces (LICENSE/NOTICE/trademark/payload author fields), and does not reopen the TASK-73 gate design.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 WHEN the sweep runs THEN it scans the working tree with the local needle set (real-name variants, absolute home paths, personal email) plus the generic rules, and records every offender with file:line and rule.
- [ ] #2 WHEN a finding sits on an attribution surface THEN it is recorded as intentionally allowed with a reason and is not changed.
- [ ] #3 WHEN a genuine leak is found THEN it is either fixed in the working tree or recorded as an explicit decision input for TASK-83, never silently dropped.
- [ ] #4 WHEN the sweep completes THEN the repo-local exclude file is narrowed to only justified entries and weavelog check passes with the local needle file present.
- [ ] #5 WHEN TASK-83 clearance begins THEN this task records the working-tree findings that TASK-83 uses for its all-refs decision.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Tests and lint pass with fresh output in the worktree
- [ ] #2 Worktree is clean (no uncommitted changes)
- [ ] #3 Branch is rebased on main and green
- [ ] #4 All acceptance criteria checked with fresh evidence (one at a time, never batched)
<!-- DOD:END -->
