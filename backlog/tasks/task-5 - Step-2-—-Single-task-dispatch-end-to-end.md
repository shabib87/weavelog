---
id: TASK-5
title: Step 2 — Single-task dispatch end-to-end
status: To Do
assignee: []
created_date: '2026-08-24 02:48'
updated_date: '2026-09-05 23:01'
labels: []
milestone: m-4
dependencies:
  - TASK-4
  - TASK-11
priority: high
type: task
ordinal: 4000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Get one task working end-to-end: SDK provider, deny-list (native permission globs + tool.execute.before), done-check, state update. --implementation-notes (driver writes progress to task itself), --modified-files set on the task, context7 enabled for worker sessions (context7_resolve-library-id → context7_query-docs; worker prompt includes "consult current SDK docs before using unverified APIs"). One task working: worktree creation, agent invocation, driver-verified done-condition, status update.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 SDK provider dispatches one task in a worktree
- [ ] #2 Deny-list enforced via native permission globs + tool.execute.before
- [ ] #3 Done-condition checked by driver (not agent self-report): tests + lint green + working tree clean + green vs rebased main
- [ ] #4 State.json updated after dispatch
- [ ] #5 --implementation-notes written by driver to the task itself
- [ ] #6 --modified-files set on the task for file→task traceability
- [ ] #7 context7 enabled for worker session; worker prompt includes doc-lookup instruction
- [ ] #8 One task completes end-to-end: worktree → agent → done-check → status update
<!-- AC:END -->
