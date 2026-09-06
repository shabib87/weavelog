---
id: TASK-52
title: TASK-51 scratch - claim gate live round-trip
status: Done
assignee:
  - '@conductor'
created_date: '2026-09-05 23:01'
updated_date: '2026-09-05 23:02'
labels:
  - deferred
  - spec-approved
dependencies: []
priority: medium
ordinal: 41000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Scratch task for the live claim-gate round-trip verification; will be archived immediately after.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 WHEN the claim gate runs on this task THEN the round-trip evidence is captured
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Tests and lint pass with fresh output in the worktree
- [ ] #2 Worktree is clean (no uncommitted changes)
- [ ] #3 Branch is rebased on main and green
- [ ] #4 All acceptance criteria checked with fresh evidence (one at a time, never batched)
<!-- DOD:END -->
