---
id: TASK-81
title: >-
  Implement ADR-006 — budget module, tier-fit checker, and the four loop
  commands (stitch/weave/loom/pulse)
status: To Do
assignee: []
created_date: '2026-09-10 02:30'
updated_date: '2026-09-10 02:30'
labels: []
dependencies:
  - TASK-80
  - TASK-6
priority: medium
ordinal: 64000
type: task
references:
  - docs/adr/0006-tiered-loop-commands.md
  - docs/research/2026-09-07-loop-taxonomy-research.md
documentation:
  - docs/AGENTS.md
  - docs/trd/backlog-lifecycle.md
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Umbrella task for everything ADR-006 (tiered loop commands + weaver persona) obligates
but no existing task tracks. Captured 2026-09-10 during the TASK-79 pre-merge audit so
the ADR's implementation obligations cannot be lost at worktree cleanup. Scope, per
ADR-006's Decision table and Consequences:

1. Four user-invocable loop commands — stitch (turn-based), weave (goal-based), loom
   (nested goal-based queue), pulse (time-based, proactive-guarded) — as skills + CLI
   triggers + hooks. Enters build scope only via a future PRD per ADR-005 artifact flow;
   until then these are a recommended future CLI surface.
2. Deterministic budget module — extends TASK-6 (three caps + session.diff no-progress)
   with the 80% inform / alert / soft-stop-at-100% ladder, evaluated only at iteration
   boundaries; weavelog-native config names, zero third-party name adoption.
3. Tier-fit checker — deterministic wrong-tier detection extending risk-signals.ts
   (ADR-004 mandate: signals on the merged diff, never LLM judgment); greenfield, no
   shipped harness does this (research §5.2).
4. payload/AGENTS.md slimming — user-level contract + one routing line; config-sync
   changes for the user-level/project-level split (TASK-23/27 machinery, TASK-28/29/30
   scaffold rules).
5. weaver name availability check (TASK-57-style: npm/GitHub/domain/trademark) — PRD
   item; gates persona adoption.
6. opencode plugin-SDK lifecycle-hook expressibility verification — must pass before
   weave's evaluator-loop mechanics ship.

Sequencing (DAG): TASK-80 (weaver sweep) and TASK-6 (budget base) first; then budget
module, tier-fit checker, CLI surface in that order; SDK verification (item 6) before
weave mechanics; name check (item 5) at PRD time. Child tasks spawned from this
umbrella cite the ADR-006 decision row they implement (ADR-005 AC traceability).

Scope notes (review round 3, 2026-09-10): (a) the Dispatch-model decision row
(subagents return findings; the weaver alone writes shared state) is implemented via
item 4's slimmed payload contract plus the weave/loom child tasks' dispatch design —
child tasks must cite that row explicitly. (b) When TASK-8 is claimed, its decision CLI
action set (approve|kickback|replan|stuck) must gain reject as a gate answer, per
ADR-006's gate placement. (c) docs/trd/worktree-discipline.md:65 still carries the
pre-ADR-006 vocabulary ("merge / kick back / re-plan") — harmonize when TASK-8 ships
(TRD edits ride under an ADR; ADR-006 is that ADR).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 WHEN the implementation plan is drafted THEN it records the sequencing TASK-80 and TASK-6 first, then budget module, tier-fit checker, CLI surface; SDK verification before weave mechanics; name availability check at PRD
- [ ] #2 IF a child task is spawned from this umbrella THEN its description cites the ADR-006 decision row it implements
- [ ] #3 WHILE the weaver name availability check has not passed THEN no weaver-named artifact ships outside documentation
- [ ] #4 WHEN stitch/weave/loom/pulse ship THEN each maps to one taxonomy tier, pauses at the two human gates (plan approval + merge approval), and the deterministic budget module governs it at iteration boundaries
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
Not planned yet. Planning happens at claim time (claim gate requires spec-approved
first). Trigger for activation: ADR-006 ratified (TASK-79 merged) AND TASK-80 complete
AND TASK-6 complete, or an explicit human decision to pull the loop surface forward
into a PRD milestone.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Created 2026-09-10 from the TASK-79 pre-merge audit (session 01a07f60 finding: ADR-006
committed to six work items that no backlog task, ROADMAP milestone, or PRD tracked;
capture-before-cleanup rule). Not claimed; spec gate runs at claim.
<!-- SECTION:NOTES:END -->

## Comments
<!-- SECTION:COMMENTS:BEGIN -->
<!-- SECTION:COMMENTS:END -->
