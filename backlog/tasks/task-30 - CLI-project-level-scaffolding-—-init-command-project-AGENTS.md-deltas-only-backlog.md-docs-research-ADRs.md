---
id: TASK-30
title: 'CLI project scaffold — conductor AGENTS, Backlog, and four docs homes'
status: To Do
assignee: []
created_date: '2026-08-31 04:01'
updated_date: '2026-09-12 20:16'
labels: []
milestone: m-4
dependencies:
  - TASK-28
  - TASK-79
ordinal: 22000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Outcome: implement the project scaffold contract in docs/trd/cli-vision.md and ADR-0008. `weavelog scaffold --project` works independently of global installation: it does not require `weavelog init`, a global OpenCode profile, or global OpenCode configuration. It creates a conductor-era project AGENTS.md, initializes Backlog, adds a placeholder .env.example, and creates neutral docs README homes for research, ADR, PRD, and TRD. Why: project setup should establish the approved workflow without taking ownership of project configuration, secrets, or policy.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 WHEN scaffold runs on a project with absent targets THEN it creates project-owned AGENTS.md, Backlog through the Backlog CLI, .env.example, docs/README.md, and README homes under docs/research, docs/adr, docs/prd, and docs/trd without requiring global OpenCode setup.
- [ ] #2 WHEN the scaffolded project AGENTS.md is read THEN it states the conductor-era v0.1 method, Backlog prerequisite, TDD-first practice, review gates, local commands and constraints, and documentation map without copying the global protocol or installing future weaver loop commands.
- [ ] #3 WHEN neutral documentation README files are created THEN they describe idea → PRD → TRD → milestone ↔ PRD → TASK; research is evidence as needed and ADRs record cross-cutting decisions at any stage.
- [ ] #4 WHEN scaffold preflight finds a conflict THEN it exits nonzero before writes; confirmed --force may replace only eligible declared leaf files with protected .bak backup and journaled recovery.
- [ ] #5 WHEN scaffold runs THEN it does not create, read, edit, own, or validate .gitignore, .env, .env.local, or .git; scaffold outputs become project-owned and are not drift-managed.
- [ ] #6 WHEN scaffold runs THEN it creates project files without installing external tools or requiring global OpenCode initialization, an OpenCode profile, or global OpenCode configuration.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Deferral recorded from TASK-23 session 2026-08-30 (owner vision: CLI works on two levels — global install + project setup).

2026-09-10 correction: moved m-5 -> m-4. Project scaffolding is portable host foundation; m-7 release checklist retains the v0.1 OpenCode subset as a blocker.

2026-09-12 scope alignment: the current description and acceptance criteria supersede the old research+ADR-only scaffold scope. Scaffold creates all four docs homes and is independent of global OpenCode initialization or profile. `.gitignore`, `.env`, `.env.local`, and `.git` remain project-owned.
<!-- SECTION:NOTES:END -->
