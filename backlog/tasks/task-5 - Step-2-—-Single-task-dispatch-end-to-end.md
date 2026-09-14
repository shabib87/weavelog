---
id: TASK-5
title: 'MVP: prove the SDK workflow on a local project'
status: To Do
assignee: []
created_date: '2026-08-24 02:48'
updated_date: '2026-09-13 17:08'
labels: []
milestone: m-4
dependencies:
  - TASK-4
  - TASK-11
  - TASK-7
references:
  - 'https://github.com/abiosoft/colima'
priority: medium
type: task
ordinal: 4000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Outcome: use TASK-4 on a real project on the author's own Mac, with an isolated worktree, independent verification and human review. Record evidence that the SDK controller invokes the selected agents, uses the installed skills/hooks and refuses invalid transitions. Why: local end-to-end proof establishes the harness before distribution testing; another person is not required. Keep the existing reviewer roster and Backlog CLI fields.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 WHEN the selected real task runs THEN the SDK executes in its worktree and the installed permission and hook boundaries remain active.
- [ ] #2 WHEN the worker reports success THEN an independent checker verifies the human-owned acceptance criteria with fresh commands and records failures without weakening assertions.
- [ ] #3 WHEN implementation changes are ready THEN Backlog records progress and modified files, and the human reviews the diff before any commit or merge.
- [ ] #4 WHEN the human approves the completed task and its verification remains valid THEN the existing lifecycle records completion and the run receipt links the task, result and evidence.
- [ ] #5 IF execution or verification fails THEN the task remains unfinished, the failure is recorded and the next repair is assigned to an existing task.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-09-06 sandboxing re-assessment: TASK-60 spike (Colima substrate + zero-dep socket loop) defines the candidate execution substrate; its recommendation feeds this step dispatch plan at activation. Research: ~/.agents/docs/research/2026-09-06-sandboxing-substrates.md (repo mirror lands with TASK-60).

2026-09-13 shipping audit: one selected task is the finish line. Extra context tools, parallelism and automatic merging are not prerequisites. Additional hosts remain future work after real OpenCode usage.

2026-09-13 user correction: this local SDK task is an MVP gate before publication. Independent review means a separate checker, not a requirement to recruit another human. A project on the author's laptop is an accepted test subject.
<!-- SECTION:NOTES:END -->
