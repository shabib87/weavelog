---
id: TASK-54
title: 'Pre-publish: research privacy sweep and npm artifact safety'
status: To Do
assignee: []
created_date: '2026-09-05 23:39'
updated_date: '2026-09-11 03:52'
labels: []
milestone: m-7
dependencies:
  - TASK-61
  - TASK-59
  - TASK-79
priority: high
ordinal: 42000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Outcome: complete two distinct release gates. First, inventory the source research material at run time and record a public or private fate for every item. Second, prove the exact npm tarball excludes backlog and other non-package material. Why: artifact safety is required before npm publication; repository and Git history clearance are a separate m-5 task and do not block npm publication.

Boundary: this task does not make the repository public, scan all Git history, or rewrite history. It supplies privacy and package evidence for the exact release candidate.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 WHEN the research privacy sweep runs THEN every enumerated source note has a recorded public or private fate and the report is green
- [ ] #2 WHEN the exact candidate tarball is inspected THEN it contains zero files under backlog and includes only the documented package allowlist
- [ ] #3 IF the privacy or artifact check fails THEN the npm release remains blocked and the failed item is named
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
2026-09-11 correction: TASK-54 owns only privacy sweep and npm artifact safety. Public repository and full-history clearance is separate m-5 release work; neither result implies the other.
<!-- SECTION:NOTES:END -->
