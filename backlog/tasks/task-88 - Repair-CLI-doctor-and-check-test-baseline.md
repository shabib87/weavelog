---
id: TASK-88
title: Repair CLI doctor and check test baseline
status: Done
assignee:
  - conductor
created_date: '2026-09-15 05:13'
updated_date: '2026-09-18 03:18'
labels:
  - spec-approved
dependencies: []
references:
  - TASK-66
modified_files:
  - src/cli/index.ts
  - tests/cli/index.test.ts
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
- [x] #1 WHEN the doctor success fixtures run THEN they install the required OpenCode adapters, isolate the fake Headroom health boundary, exit 0, and the missing-adapter failure fixture remains covered
- [x] #2 WHEN check --stack-only runs with the default documentation setting THEN it resolves the existing worktree-discipline document and its matching fixture exits 0 without an environment override
- [x] #3 WHEN the focused CLI suite and the repository test command run after the repair THEN the three recorded failures no longer occur and no unrelated test failure is ignored
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Tests and lint pass with fresh output in the worktree
- [x] #2 Worktree is clean (no uncommitted changes)
- [x] #3 Branch is rebased on main and green
- [x] #4 All acceptance criteria checked with fresh evidence (one at a time, never batched)
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Reproduce the three named failures in tests/cli/index.test.ts and identify the fixture setup and stale default path involved. 2. Add or tighten one focused failing test for each required behavior, and run it to confirm the expected red failure. 3. Make the smallest fixture and CLI default-path changes needed for each test to pass; rerun the focused test after each change. 4. Run the focused CLI suite, npm test, npm run lint, and npm run typecheck. 5. Record changed files and fresh evidence for independent review; do not commit or merge.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-09-15 blocker: claim attempt from .worktrees/TASK-88 was refused by the lifecycle guard even though git rev-parse reports task/TASK-88. The guard uses the host process cwd (main) rather than the command cwd, so it reports main. No bypass used; TASK-88 remains To Do.

2026-09-15 SDK run failure: controller receipt ~/.local/state/weavelog/runs/TASK-88-2026-09-15T05-33-58-956Z.json records implement error 'fetch failed'; no commands or worktree changes occurred. Direct read-only OpenCode calls succeeded, including the configured implementer model. SDK is 1.18.30 while installed OpenCode CLI is 1.18.31; this is the current version-skew hypothesis. No bypass or version change attempted.

2026-09-15 version-aligned retry still failed at implement: receipt ~/.local/state/weavelog/runs/TASK-88-2026-09-15T05-47-43-622Z.json reports 'fetch failed'. A read-only SDK session-create plus implementer prompt succeeds under 1.18.31, so version skew is not the sole cause. The remaining failure is specific to the controller's full implement-stage run; no task code changed.

2026-09-18 TASK-5 implementation-ready controller run verified without invoking a mutating implementer or rework. Receipt: ~/.local/state/weavelog/runs/TASK-88-2026-09-18T02-25-13-027Z.json. Repository test result: 742 tests, 738 pass, 3 fail, all in the pre-existing live Headroom compression suite (tokens_saved remained 0 and ccr_hashes empty although /health was up). TASK-88's three CLI failures did not recur; lint and typecheck passed. Target source diff remained the five-line hermetic doctor fixture change. TASK-88 remains unfinished pending an in-scope decision for the unrelated live-proxy baseline; no retry performed.

2026-09-18 human approved excluding exactly three unrelated live Headroom assertions from the completion gate: 2K tokens_saved, CCR hashes, and 10K tokens_saved. TASK-88 focused CLI tests, all remaining repository tests, lint, typecheck, and independent review remain required.

2026-09-18 controlled verification succeeded with no implementer and zero rework. Focused CLI suite: 40 passed, 0 failed. Approved repository command: 742 tests, 738 passed, 0 failed, with exactly the three named live Headroom assertions excluded. Lint and typecheck exited 0. Independent reviewer diff-reviewer-glm returned APPROVE. The controller stopped at the human gate with final status awaiting-human. Durable receipt: ~/.local/state/weavelog/runs/TASK-88-2026-09-18T02-57-14-833Z.json. No commit or merge occurred.

2026-09-18 post-rebase verification: focused CLI 40/40; scoped repository 738/738 with one approved skip group; Biome and tsc passed. Branch rebased onto main at 96c1768 before merge.
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

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Repaired the default stack-only documentation path and made both doctor success fixtures install adapters and isolate Headroom health. Verified after rebase with focused CLI 40/40, scoped repository 738/738 plus the approved Headroom skip group, Biome, TypeScript, and independent reviewer APPROVE. Controller receipt ended awaiting-human with zero rework before human merge approval.
<!-- SECTION:FINAL_SUMMARY:END -->
