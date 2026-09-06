---
id: TASK-37
title: >-
  Intercept backlog-CLI and bash writes on main (enforce.ts blind spot) -
  deferred
status: To Do
assignee: []
created_date: '2026-09-03 02:11'
updated_date: '2026-09-03 02:43'
labels: []
dependencies: []
references:
  - docs/research/2026-08-29-backlog-mcp-enforcement-bypass.md
priority: low
ordinal: 29000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Deferral named in TASK-36. KIND: decision-type unknown — requires human collaboration + design pass at pickup; do NOT pick up without one. enforce.ts write-block intercepts edit/write TOOLS on main only; backlog CLI and bash subprocess writes on main are invisible to it (incident: 2026-09-02, conductor edited backlog files on main via CLI; pre-commit hook was the only backstop and was bypassed). Forecast in docs/research/2026-08-29-backlog-mcp-enforcement-bypass.md lines 106-121.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 WHEN a backlog-CLI write (task create/edit/complete/archive) or a bash-subprocess write touches main THEN it is either blocked before landing or deterministically detected and surfaced
- [ ] #2 WHEN the chosen mechanism is picked THEN the decision is recorded (backlog decision or ADR) before implementation starts
<!-- AC:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: conductor
created: 2026-09-03 02:43
---
Candidate approaches seen so far (options, not a chosen plan): (A) opencode plugin bash-command interceptor — blocks at tool.execute.before, fails open on non-obvious writes; (B) backlog CLI wrapper/shim — deterministic, but only covers CLI path, not raw bash writes; (C) drift-checker — detect-after-the-fact via scheduled config/harness state comparison, zero blocking but no prevention. Tradeoffs: prevention vs coverage vs determinism. Pick with the human at design pass.
---
<!-- COMMENTS:END -->
