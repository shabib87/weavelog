---
id: TASK-4
title: Step 1 — Driver skeleton + port + state schema + backlog integration
status: To Do
assignee: []
created_date: '2026-08-24 02:48'
updated_date: '2026-09-05 23:01'
labels: []
milestone: m-4
dependencies:
  - TASK-3
  - TASK-11
priority: high
type: task
ordinal: 3000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Build the driver skeleton: read tasks via `backlog task list --json` (MCP or CLI), define IAgentProvider signatures (include capability query, NormalizedEvent schema, verdict() failure path, model/reasoning selection via TaskSpec), toposort-free scheduler leaning on `--ready` with cycle detection + deadlock watchdog (--ready empty while non-Done tasks exist ⇒ alert), confirm `--ready` excludes Done tasks, done-condition contract as a failing test first (TDD), state.json schema with pessimistic crash semantics, conductor-boundary health assertion (machine-checkable: verify conductor's dispatch log shows zero file-write tool calls), onStatusChange callback (config-level shell command for status drift event channel), milestone for DAG phases, DoD defaults via `definition_of_done_defaults_upsert` (4-point done-condition), --modified-files for file→task traceability.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Driver reads tasks via backlog task list --json
- [ ] #2 IAgentProvider signatures defined with capability query, NormalizedEvent, verdict() failure path, TaskSpec model/reasoning selection
- [ ] #3 Scheduler leans on --ready with cycle detection + deadlock watchdog
- [ ] #4 Done-condition contract as failing test (TDD — test fails before any dispatch exists)
- [ ] #5 state.json schema with pessimistic crash semantics documented
- [ ] #6 Conductor-boundary health assertion implemented (machine-checkable)
- [ ] #7 onStatusChange callback configured for status drift event channel
- [ ] #8 milestone created for DAG phases
- [ ] #9 DoD defaults set via definition_of_done_defaults_upsert (4-point done-condition)
- [ ] #10 --modified-files set on task creation for file→task traceability
<!-- AC:END -->
