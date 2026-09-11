---
id: TASK-68
title: Portable Headroom compatibility configuration
status: To Do
assignee: []
created_date: '2026-09-06 22:11'
updated_date: '2026-09-11 04:05'
labels:
  - harness
milestone: m-7
dependencies:
  - TASK-59
  - TASK-79
priority: high
ordinal: 56000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Outcome: remove the Headroom memory-tool incompatibility through a reproducible, portable configuration path and verify it on the supported OpenCode profile. Why: a one-machine plist patch cannot be a release requirement.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 WHEN the supported profile is configured from the documented portable source THEN Headroom disables incompatible memory-tool injection without embedding a personal absolute path
- [ ] #2 WHEN a fresh OpenCode session uses the supported profile THEN it has no unavailable memory-tool bounce and produces an audit record
- [ ] #3 IF the portable Headroom configuration fails THEN the documented rollback restores the prior configuration and names the failure
- [ ] #4 WHEN this task closes THEN the exact candidate and clean-user procedure can reproduce the same Headroom behavior
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Tests and lint pass with fresh output in the worktree
- [ ] #2 Worktree is clean (no uncommitted changes)
- [ ] #3 Branch is rebased on main and green
- [ ] #4 All acceptance criteria checked with fresh evidence (one at a time, never batched)
<!-- DOD:END -->
