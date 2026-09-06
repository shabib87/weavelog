---
id: TASK-49
title: Adopt session hand-off skill for crash recovery (ponytail steal)
status: To Do
assignee: []
created_date: '2026-09-05 16:59'
updated_date: '2026-09-05 17:00'
labels:
  - deferred
dependencies: []
priority: low
type: enhancement
ordinal: 38000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Adapt Matt Pocock's session hand-off skill as a cheap complement to the crash contract. Current crash contract has no auto-recovery in v1 — the human resets by hand (worktree-discipline.md). A hand-off artifact is the lightweight version of auto-recovery: when a conductor crashes or a thread rolls over, the next thread resumes from a written state instead of re-reading the full session. Ponytail steal (TASK-41 pattern): copy, evaluate fit, adapt or reject with recorded rationale.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 WHEN the hand-off skill is evaluated THEN Matt Pocock's skill SHALL be reviewed for fit with the conductor flow and crash contract, and the adopt/adapt/reject decision SHALL be recorded with rationale
- [ ] #2 IF a conductor crash or thread rollover occurs THEN the hand-off artifact SHALL give the next thread enough state (in-flight tasks, decisions, next action) to resume without re-reading the full session
- [ ] #3 WHEN the hand-off mechanism is chosen THEN it SHALL compose with the existing backlog lifecycle (task notes/comments as plan of record) rather than duplicating state into a parallel format
<!-- AC:END -->
