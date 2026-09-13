---
id: TASK-80
title: Retire conductor vocabulary — weaver sweep across active surfaces
status: To Do
assignee: []
created_date: '2026-09-10 01:54'
updated_date: '2026-09-12 20:16'
labels:
  - spec-approved
milestone: m-4
dependencies:
  - TASK-79
  - TASK-82
  - TASK-28
priority: high
ordinal: 63500
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Outcome: replace the active agent-role term conductor with the approved persona name after the separate human-approved name-availability task. Include payload, source, tests, active technical and product documents, relevant task assignees, the dispatch diagram, and the conductor-era project AGENTS.md template defined by TASK-28 and docs/trd/cli-vision.md. Historical attribution and archived research remain unchanged. Why: the future persona rename must cover the project scaffold created by the v0.1 CLI contract.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 WHEN the separate persona-name availability task has recorded human approval and this sweep completes THEN no active surface names the agent role conductor except historical attribution and the NORTH_STAR human-role carve-out
- [ ] #2 IF the persona-name availability task is incomplete or unapproved THEN no code, documentation, configuration, or diagram rename ships
- [ ] #3 WHEN the dispatch diagram is renamed THEN it is regenerated and its index entry is updated in the same change
- [ ] #4 WHEN the sweep completes THEN tests and formatting pass with fresh output in its worktree
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
2026-09-11 correction: TASK-57 ratified the product name Weavelog; it is not weaver-persona availability evidence. A separate human-approved persona-name availability task must pass before TASK-80 is claimed. Its specification is recorded in TASK-79 while Backlog task creation is unavailable.

2026-09-11 correction: predecessor is TASK-82 (Verify weaver persona name availability). TASK-80 must not be claimed until TASK-82 has recorded human approval.

2026-09-12 scope alignment: TASK-28 is a dependency so the future rename includes the conductor-era project scaffold AGENTS template.
<!-- SECTION:NOTES:END -->
