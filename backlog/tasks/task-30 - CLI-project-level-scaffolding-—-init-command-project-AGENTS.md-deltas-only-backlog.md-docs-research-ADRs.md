---
id: TASK-30
title: >-
  CLI project-level scaffolding — scaffold --project: AGENTS.md deltas, Backlog,
  research, ADRs
status: To Do
assignee: []
created_date: '2026-08-31 04:01'
updated_date: '2026-09-11 04:27'
labels: []
milestone: m-4
dependencies:
  - TASK-28
  - TASK-79
ordinal: 22000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Outcome: provide portable project scaffolding after the host installation prerequisites are already satisfied. Implement `weavelog scaffold --project` to create project-level AGENTS.md deltas, initialize Backlog, and create docs/research plus docs/adr scaffolding. Why: project setup must be portable and must not duplicate the global protocol or install external tools.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 WHEN `weavelog scaffold --project` runs in an empty project THEN it creates project AGENTS.md deltas, initializes Backlog, and creates docs/research plus docs/adr scaffolding without duplicating global protocol content or installing external tools
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Deferral recorded from TASK-23 session 2026-08-30 (owner vision: CLI works on two levels — global install + project setup).

2026-09-10 correction: moved m-5 -> m-4. Project scaffolding is portable host foundation; m-7 release checklist retains the v0.1 OpenCode subset as a blocker.
<!-- SECTION:NOTES:END -->
