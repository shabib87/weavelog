---
id: TASK-30
title: >-
  CLI project-level scaffolding — init command: project AGENTS.md (deltas only),
  backlog.md, docs/research, ADRs
status: To Do
assignee: []
created_date: '2026-08-31 04:01'
updated_date: '2026-09-03 01:05'
labels: []
milestone: m-5
dependencies:
  - TASK-28
ordinal: 22000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
PROJECT level of the cli-vision doc (TASK-28). Implement the CLI init command: scaffold project-level AGENTS.md (deltas only — global protocol is inherited, not duplicated), backlog.md (via backlog init), docs/research/ and docs/architecture/ ADR scaffolding.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 WHEN the CLI init command runs in an empty project THEN it creates project AGENTS.md (deltas only), backlog.md (via backlog init), docs/research/ and docs/architecture/ (ADR) scaffolding, without duplicating global protocol content
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Deferral recorded from TASK-23 session 2026-08-30 (owner vision: CLI works on two levels — global install + project setup).
<!-- SECTION:NOTES:END -->
