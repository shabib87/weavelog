---
id: TASK-81
title: >-
  Implement ADR-006 — budget module, tier-fit checker, and the four loop
  commands (stitch/weave/loom/pulse)
status: To Do
assignee: []
created_date: '2026-09-10 02:30'
updated_date: '2026-09-11 04:05'
labels: []
milestone: m-4
dependencies:
  - TASK-6
  - TASK-7
  - TASK-8
  - TASK-9
  - TASK-80
references:
  - docs/adr/0006-tiered-loop-commands.md
  - docs/research/2026-09-07-loop-taxonomy-research.md
documentation:
  - docs/AGENTS.md
  - docs/trd/backlog-lifecycle.md
priority: medium
type: task
ordinal: 64000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Outcome: implement the future command surface that ADR-006 defines: stitch, weave, loom, and pulse; the budget and tier-fit modules; the user/project contract; and the OpenCode plugin-SDK lifecycle proof. Why: later command work must keep human decisions, review independence, recovery, and audit records intact.

Scope is future implementation only. A separate human-approved weaver-persona availability task must precede TASK-80; it is distinct from the completed TASK-57 product-name research. TASK-80 performs the approved active-surface persona sweep. Do not ship a command merely because this umbrella task exists.

Sequencing: TASK-6 establishes the budget base; TASK-7 establishes review; TASK-8 establishes human decision actions; TASK-9 establishes recovery. Persona availability -> TASK-80 precedes the persona-dependent surface. Child tasks must cite the relevant ADR-006 decision row and the applicable budget, review, decision, or recovery task; this umbrella dependency list is not a substitute for those relationships.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 WHEN the implementation plan is drafted THEN it sequences TASK-6 budget, TASK-7 review, TASK-8 decisions, TASK-9 recovery, and the separately approved persona-availability prerequisite -> TASK-80 before each dependent command capability
- [ ] #2 IF a child task is spawned from this umbrella THEN its description cites the ADR-006 decision row and every applicable budget, review, decision, or recovery dependency
- [ ] #3 WHILE the weaver-persona availability prerequisite is not approved THEN no weaver-named code, documentation, configuration, or diagram artifact ships
- [ ] #4 WHEN stitch, weave, loom, or pulse ships THEN it maps to one taxonomy tier, pauses at plan and merge approval, and uses boundary-based budget accounting with the separate watchdog and checkpoint rules
- [ ] #5 WHEN warp is implemented THEN it separates human-led WHAT dialogue from HOW plan attack, supports human-selected light and full tiers, preserves dissent receipts, charges budget boundaries, and routes changed scope through replan
- [ ] #6 IF a requested full cross-family review cannot obtain another model family THEN the command reports that limitation and requires an explicit human-selected alternative before continuing
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Tests and lint pass with fresh output in the worktree
- [ ] #2 Worktree is clean (no uncommitted changes)
- [ ] #3 Branch is rebased on main and green
- [ ] #4 All acceptance criteria checked with fresh evidence (one at a time, never batched)
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Not planned yet. Planning happens only when a future worker claims this task after its spec gate. Activation requires ratified ADR-006, approved persona-availability evidence, TASK-80 complete, and the relevant base task for each capability complete.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Created 2026-09-10 from the TASK-79 pre-merge audit so ADR-006 obligations cannot be lost. 2026-09-11 correction: a separate persona check precedes TASK-80; completed TASK-57 applies only to the product name. Warp duties are explicit; child tasks carry their actual budget, review, decision, and recovery relationships.
<!-- SECTION:NOTES:END -->

## Comments
<!-- SECTION:COMMENTS:BEGIN -->
<!-- SECTION:COMMENTS:END -->
