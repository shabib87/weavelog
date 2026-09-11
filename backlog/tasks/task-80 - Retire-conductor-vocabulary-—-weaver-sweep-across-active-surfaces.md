---
id: TASK-80
title: Retire conductor vocabulary — weaver sweep across active surfaces
status: To Do
assignee: []
created_date: '2026-09-10 01:54'
updated_date: '2026-09-10 03:30'
labels:
  - spec-approved
dependencies:
  - TASK-79
priority: high
ordinal: 63500
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
ADR-006 replaces the conductor persona with the weaver. Sweep all ACTIVE surfaces where conductor still names the agent role: payload/ (AGENTS.md routing line, skills, agents, prompts, config), src/ (task-flow.ts default assignee @conductor -> @weaver — behavioral, update tests in lockstep), tests/ fixtures, active docs/trd + docs/adr + docs/prd mentions, backlog assignee fields, and docs/trd/diagrams/conductor-dispatch.html (rename to weaver-dispatch.html + regenerate). Rules: preserve historical attribution (author: conductor stays on already-written docs); exclude docs/archive/ and dated research corpus; NORTH_STAR:37 ('The human runs the conductor role') is OUT OF SCOPE — describes the human's role, needs a separate human decision. Sequence: execute after ADR-006 ratification (TASK-79 merged) AND the PRD weaver name-availability check passes (per ADR-006 Consequences; code renames wait for the check, doc renames can go at ratification), BEFORE weave/loom implementation. Source: naming consult 2026-09-08 (name-availability researcher + naming-architecture reviewer, both recommended this option; product stays weavelog — npm 'weaver' is taken since 2012 and crowded in the agent space).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 WHEN the sweep completes THEN no ACTIVE surface (payload/, src/, tests/, active docs/trd + docs/adr + docs/prd, backlog assignee fields) names the agent role "conductor", except historical attribution (author: conductor on already-written docs) and the NORTH_STAR:37 human-role carve-out
- [ ] #2 IF a code rename is staged (src/tools/task-flow.ts default assignee @conductor -> @weaver, tests in lockstep) THEN it waits until the PRD weaver name-availability check passes; doc renames may proceed at ADR-006 ratification
- [ ] #3 WHEN docs/trd/diagrams/conductor-dispatch.html is renamed THEN it is regenerated as weaver-dispatch.html and the diagrams README index row is updated in the same change
- [ ] #4 WHEN the sweep completes THEN tests and lint pass with fresh output in the worktree
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Tests and lint pass with fresh output in the worktree
- [ ] #2 Worktree is clean (no uncommitted changes)
- [ ] #3 Branch is rebased on main and green
- [ ] #4 All acceptance criteria checked with fresh evidence (one at a time, never batched)
<!-- DOD:END -->
