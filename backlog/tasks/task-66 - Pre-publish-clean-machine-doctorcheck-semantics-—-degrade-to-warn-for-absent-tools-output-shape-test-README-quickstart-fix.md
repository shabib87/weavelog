---
id: TASK-66
title: Supported-profile doctor and check semantics
status: To Do
assignee: []
created_date: '2026-09-06 20:33'
updated_date: '2026-09-11 04:00'
labels:
  - harness
milestone: m-7
dependencies:
  - TASK-59
  - TASK-79
priority: high
type: bug
ordinal: 54000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Outcome: doctor and check distinguish preparation warnings from failures of the installed supported profile. Why: before initialization, setup guidance may warn; after initialization, OpenCode, Headroom, Backlog, and required gates are release requirements and must fail loudly when absent.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 WHEN doctor runs before initialization without Backlog THEN it reports setup incomplete as a warning, uses the PATH-walking helper, and exits 0
- [ ] #2 WHEN doctor or check runs on the supported profile after init THEN missing OpenCode, Headroom, Backlog, or a required gate fails the profile; only documented optional tools warn when absent
- [ ] #3 WHEN the fix lands THEN tests pin the doctor output shape through the Backlog seam and a scrubbed PATH
- [ ] #4 WHEN the README quickstart is inspected THEN it distinguishes pre-init setup warnings from post-init required-tool failures
- [ ] #5 WHEN this task closes THEN dependent portability tasks rerun their doctor evidence after it lands
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Tests and lint pass with fresh output in the worktree
- [ ] #2 Worktree is clean (no uncommitted changes)
- [ ] #3 Branch is rebased on main and green
- [ ] #4 All acceptance criteria checked with fresh evidence (one at a time, never batched)
- [ ] #5 Doctor re-run on the real machine demonstrates the warn path (backlog absent is impossible to simulate locally; seam-based test covers it)
<!-- DOD:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-09-10 correction: OpenCode, Headroom, Backlog, required gates, and audit output are core supported-profile requirements. Pre-init warnings do not mean those tools are optional after init.
<!-- SECTION:NOTES:END -->
