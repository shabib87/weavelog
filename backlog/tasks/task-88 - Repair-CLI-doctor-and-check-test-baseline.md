---
id: TASK-88
title: Repair CLI doctor and check test baseline
status: In Progress
assignee:
  - conductor
created_date: '2026-09-15 05:13'
updated_date: '2026-09-15 05:25'
labels:
  - spec-approved
dependencies: []
references:
  - TASK-66
priority: high
type: bug
ordinal: 71000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Outcome: restore the CLI doctor and check test baseline so the SDK controller can verify a real task without masking unrelated failures. Why: the current three failing CLI tests prevent every strict controller run from reaching independent review, even when its task work is correct. Scope: repair only the two doctor success fixtures and the stale stack-only default path identified in TASK-66. TASK-66 retains its broader supported-profile behavior, active OpenCode-source detection, and README work.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 WHEN the doctor success fixtures run THEN they install the required OpenCode adapters, isolate the fake Headroom health boundary, exit 0, and the missing-adapter failure fixture remains covered
- [ ] #2 WHEN check --stack-only runs with the default documentation setting THEN it resolves the existing worktree-discipline document and its matching fixture exits 0 without an environment override
- [ ] #3 WHEN the focused CLI suite and the repository test command run after the repair THEN the three recorded failures no longer occur and no unrelated test failure is ignored
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Tests and lint pass with fresh output in the worktree
- [ ] #2 Worktree is clean (no uncommitted changes)
- [ ] #3 Branch is rebased on main and green
- [ ] #4 All acceptance criteria checked with fresh evidence (one at a time, never batched)
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Reproduce the three named failures in tests/cli/index.test.ts and identify the fixture setup and stale default path involved. 2. Add or tighten one focused failing test for each required behavior, and run it to confirm the expected red failure. 3. Make the smallest fixture and CLI default-path changes needed for each test to pass; rerun the focused test after each change. 4. Run the focused CLI suite, npm test, npm run lint, and npm run typecheck. 5. Record changed files and fresh evidence for independent review; do not commit or merge.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-09-15 blocker: claim attempt from .worktrees/TASK-88 was refused by the lifecycle guard even though git rev-parse reports task/TASK-88. The guard uses the host process cwd (main) rather than the command cwd, so it reports main. No bypass used; TASK-88 remains To Do.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: @conductor
created: 2026-09-15 05:14
---
HITL spec gate approved by user 2026-09-15: exact scope and three acceptance criteria presented in chat.
---

author: @conductor
created: 2026-09-15 05:25
---
HITL plan gate approved by user 2026-09-15: five-step test-first repair plan presented in chat.
---
<!-- COMMENTS:END -->
