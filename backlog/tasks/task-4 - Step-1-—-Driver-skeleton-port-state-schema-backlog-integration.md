---
id: TASK-4
title: 'MVP: implement one TypeScript-controlled OpenCode workflow'
status: To Do
assignee: []
created_date: '2026-08-24 02:48'
updated_date: '2026-09-13 17:08'
labels: []
milestone: m-4
dependencies:
  - TASK-3
  - TASK-11
priority: medium
type: task
ordinal: 3000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Outcome: implement a Node/TypeScript controller for one explicitly selected Backlog task using the OpenCode SDK behavior proven by TASK-3. Reuse the existing agent roster, skills, worktree tools, hooks and ledger. The controller owns ordered transitions through implementation, verification, independent review, bounded failure/rework and the human gate. Why: this is the user's core harness, and it belongs in 0.1.0. Do not build a general scheduler, new host, generic provider framework or automatic merge system.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 WHEN a user selects an eligible task THEN the runner reads it through the Backlog CLI JSON interface and invokes the verified OpenCode SDK in that task's worktree.
- [ ] #2 WHEN the run succeeds, fails, times out or is cancelled THEN it records task identity, outcome and evidence location without marking unverified work Done.
- [ ] #3 WHEN a permission or hook refuses an operation THEN the runner preserves the refusal and does not bypass it.
- [ ] #4 WHEN the runner stops THEN it leaves enough state to inspect the work and recover manually; it does not commit, merge or publish without the existing human approval.
- [ ] #5 WHEN the workflow advances THEN TypeScript checks the preceding stage's required evidence, rejects missing or failed checks/reviews, and stops at the existing human approval gate; a prompt instruction alone cannot advance the controller.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-09-13 shipping audit: remove speculative abstraction/scheduler/watchdog/callback/milestone requirements from this first runner. Revive those capabilities in their existing tasks only when usage demonstrates the need. Human spec and plan approval still precede implementation.

2026-09-13 user correction: include this bounded controller in the MVP. Reuse configured agents and skill instructions through OpenCode rather than treating the standalone OpenRouter reviewer helper as a native subagent. Record effective agent/model/profile identity. Future scheduling and additional hosts stay deferred.
<!-- SECTION:NOTES:END -->
