---
id: TASK-68
title: Portable Headroom compatibility configuration
status: To Do
assignee: []
created_date: '2026-09-06 22:11'
updated_date: '2026-09-13 18:45'
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
- [ ] #4 WHEN this task closes THEN its pinned Headroom fix has reproducible evidence suitable for the TASK-67 exact-candidate test on the author's Mac using isolated roots or a local test account; TASK-67 proves final installed-candidate behavior, and another person, another machine or a mandatory clean-user account is not required.
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
2026-09-13 accepted local-proof clarification: the prior clean-user phrase does not require another person, another machine or a specific account-creation procedure. This task verifies the bounded Headroom fix; TASK-67 owns final installed-candidate proof using the agreed isolated own-Mac strategy. No new dependency on TASK-67 is introduced.
<!-- SECTION:NOTES:END -->
