---
id: TASK-69
title: >-
  Tool dependency audit - stay leave build verdicts for every weavelog
  dependency
status: To Do
assignee: []
created_date: '2026-09-06 22:50'
updated_date: '2026-09-06 23:51'
labels:
  - harness
dependencies:
  - TASK-68
  - TASK-59
priority: medium
ordinal: 56500
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Audit every tool weavelog depends on and record a stay/leave/build verdict with measured evidence. Inventory: opencode, headroom proxy (launchd, --mode cache, include-usage patch in pipx venv), rtk, backlog.md CLI, MCP servers (context7, tavily, semgrep, headroom-MCP, Astro docs), OpenRouter provider + 6-model roster, launchd, node22/tsx/bun runtime, biome, node:test. For each: what it measurably delivers, whether the integration is on the vendor's documented path (docs-audited) vs custom/off-road, fragility inventory (hand patches, stale AGENTS.md references, upgrade-wipe risk). Builds on ~/.agents/docs/research/2026-09-06-headroom-memory-opencode-bounce.md. Read-only audit: any resulting change goes through its own task.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 WHEN the audit completes, THE inventory SHALL cover every runtime dependency of the weavelog stack with measured evidence (savings counters, usage counts, docs-audit results)
- [ ] #2 WHEN each tool is assessed, THE verdict SHALL be exactly one of stay, leave, or build, with cited evidence
- [ ] #3 IF a tool depends on an undocumented path or hand-applied patch, THEN the audit SHALL record the fragility plus an upstream-contribution or migration option
- [ ] #4 WHEN a leave or build verdict is recorded, IT SHALL include a migration sketch and a rollback note
- [ ] #5 WHEN the audit doc lands, IT SHALL cross-reference the 2026-09-06 headroom research doc, TASK-65, and TASK-40
- [ ] #6 WHILE the audit runs, NO tool configuration SHALL be modified (read-only audit; any change goes through its own task)
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Tests and lint pass with fresh output in the worktree
- [ ] #2 Worktree is clean (no uncommitted changes)
- [ ] #3 Branch is rebased on main and green
- [ ] #4 All acceptance criteria checked with fresh evidence (one at a time, never batched)
<!-- DOD:END -->
