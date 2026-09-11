---
id: TASK-53
title: 'Pre-publish: reproducible release instructions'
status: To Do
assignee: []
created_date: '2026-09-05 23:39'
updated_date: '2026-09-11 05:22'
labels:
  - spec-approved
milestone: m-7
dependencies:
  - TASK-58
  - TASK-59
  - TASK-79
modified_files:
  - README.md
priority: high
ordinal: 41000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Outcome: publish concise, reproducible installation, configuration, and release instructions for the supported v0.1 profile. Why: external OpenCode, Headroom, Backlog, and required review/security tools are mandatory through pinned instructions; an evaluator must be able to prepare the supported profile before the exact-candidate test. Boundary: a broader editorial voice pass is separate future work and is not a release blocker.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 WHEN the release instructions are followed on a clean supported macOS profile THEN they identify pinned installation steps for OpenCode, Headroom, Backlog, required review/security gates, and the audit-output location
- [ ] #2 WHEN an instruction names an optional tool or credential-dependent integration THEN it states the capability limit without presenting the core supported profile as optional
- [ ] #3 WHEN the release instructions change THEN TASK-67 uses the same commands and records any divergence as a blocker
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
2026-09-11 correction: TASK-56 architecture policy is resolved in TASK-79 through ADR-007. TASK-56 unrelated cleanup remains separate and does not block this required release-instructions task.

2026-09-11 partial progress: added the public pre-release README notice and labelled the quickstart as planned v0.1. The three release-instructions acceptance criteria remain unchecked; TASK-53 returns to To Do for the full supported-profile instructions.
<!-- SECTION:NOTES:END -->
