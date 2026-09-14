---
id: TASK-3
title: 'MVP: prove one OpenCode SDK invocation'
status: To Do
assignee: []
created_date: '2026-08-24 02:48'
updated_date: '2026-09-13 17:08'
labels: []
milestone: m-4
dependencies:
  - TASK-11
  - TASK-55
priority: medium
type: spike
ordinal: 2000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Outcome: verify the pinned OpenCode SDK can run one bounded task under the supported Node runtime, select agents from the existing roster, exercise installed skills and hooks, return a result and terminate on failure. Why: a TypeScript-controlled workflow is part of the user's 0.1.0 MVP. Prove it now in a disposable local project on the author's Mac; neither npm publication nor an external tester is a prerequisite. Defer proxy TTL research, broad event inventories and cross-host features.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 WHEN the probe runs against the pinned supported SDK version THEN it creates a session, sends a task and records a usable result with the actual request and response shape.
- [ ] #2 WHEN the task times out, errors or is cancelled THEN execution terminates through a verified abort/close path and records the failure without claiming completion.
- [ ] #3 WHEN the SDK task attempts an operation forbidden by the installed profile THEN the real hook or permission boundary refuses it and records evidence.
- [ ] #4 WHEN the probe concludes THEN its version, commands, results and limitations are recorded in this task, providing the inputs for TASK-4 without requiring a new research document or milestone.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-09-06 DAG update (human-approved): dependencies extended to TASK-55 (re-activate live enforcement) and TASK-56 (repo cleanup pass) — driver chain starts on a clean, enforcement-protected repo.

2026-09-13 shipping audit: remove the TASK-56 cleanup dependency. The former twelve-probe Bun/TTL/event/cost investigation is deferred until a concrete runner requirement needs it. Current official SDK documentation: https://opencode.ai/docs/sdk/ . Its example/table formatting fields differ, so verify the pinned installed version instead of preserving an untested v1/v2 assertion.

2026-09-13 user correction: TypeScript SDK orchestration is the intended harness, not an optional post-release feature. The prior TASK-45 dependency and post-publication wording are superseded. Official documentation read: https://opencode.ai/docs/sdk/ and https://opencode.ai/docs/agents/ . Validate the pinned API and effective profile locally before the runner.
<!-- SECTION:NOTES:END -->
