---
id: TASK-5
title: 'MVP: prove the SDK workflow on a local project'
status: Done
assignee:
  - '@conductor'
created_date: '2026-08-24 02:48'
updated_date: '2026-09-18 03:21'
labels:
  - harness
  - spec-approved
milestone: m-4
dependencies:
  - TASK-4
  - TASK-11
  - TASK-7
references:
  - 'https://github.com/abiosoft/colima'
modified_files:
  - .gitignore
  - payload/config/harnesses/opencode.json
  - payload/config/opencode.jsonc
  - payload/config/plugins/opencode-tmp.ts
  - src/hooks/opencode-adapters.ts
  - src/hooks/opencode-tmp.ts
  - src/runner/controller.ts
  - src/runner/record.ts
  - src/runner/session.ts
  - src/runner/status.ts
  - src/runner/types.ts
  - src/runner/workspace.ts
  - src/tools/runner.ts
  - tests/cli/index.test.ts
  - tests/opencode-adapters.test.ts
  - tests/payload/opencode-tmp.test.ts
  - tests/runner-session.test.ts
  - tests/runner-stages.test.ts
  - tests/runner-status.test.ts
  - tests/runner-workspace.test.ts
  - tests/runner.test.ts
priority: medium
type: task
ordinal: 4000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Outcome: use TASK-4 to run TASK-88 on the author Mac, with an isolated worktree, a managed worktree-local temporary directory, independent verification, and human review. The managed OpenCode adapter provides .weavelog/runs/<run-id>/tmp for all OpenCode threads, so autonomous runs do not ask for external-directory permission. Record evidence that the SDK controller invokes selected agents, uses installed skills and hooks, and refuses other invalid transitions. Why: TASK-88 repairs the current test baseline and is useful release-blocking work, so its successful local run proves the harness before distribution testing. Keep the existing reviewer roster and Backlog CLI fields.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 WHEN TASK-88 runs through the SDK controller THEN it executes in its worktree, the managed .weavelog/runs/<run-id>/tmp location is available without a prompt, and installed permission and hook boundaries remain active
- [x] #2 WHEN the TASK-88 worker reports success THEN an independent checker verifies the human-owned acceptance criteria with fresh commands and records failures without weakening assertions
- [x] #3 WHEN TASK-88 implementation changes are ready THEN the TASK-5 and TASK-88 Backlog records show progress and modified files, and the human reviews the diff before any commit or merge
- [x] #4 WHEN the human approves completed TASK-88 and its verification remains valid THEN the existing lifecycle records completion and the run receipt links TASK-5, TASK-88, result, and evidence
- [x] #5 IF TASK-88 execution or verification fails THEN TASK-5 and TASK-88 remain unfinished, the failure is recorded, and the next repair is assigned to an existing task
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Confirm TASK-88 is spec-approved, in progress, and isolated in .worktrees/TASK-88. 2. Run the existing TypeScript SDK controller against TASK-88 from the local repository, without bypassing hooks, permissions, commits, or merges. 3. Inspect the run receipt, command output, agent identities, and Backlog progress produced by the controller. 4. Dispatch an independent checker to verify TASK-88's approved acceptance criteria with fresh commands and record its result. 5. Present the task diff and verification evidence for human merge approval; do not mark either task complete, commit, or merge before that approval.

6. Align the SDK package and declared OpenCode version to exact 1.18.31 after the user's explicit approval; refresh the lockfile, then repeat the SDK run.

7. For every controller run, create a gitignored .weavelog-tmp/<run-id> directory inside the target worktree, set TMPDIR for the OpenCode server, instruct the worker to use only that directory, and reject outside-worktree permission requests without waiting for human input. Add red-first coverage for the temp path and permission refusal, then rerun TASK-88.

8. Add a persisted, worktree-local heartbeat/status file for each controller run, update it from OpenCode session status and idle events, and verify it with focused tests before retrying TASK-88.

9. Keep live run state and scratch files worktree-local, and embed the heartbeat transition history plus final status in the durable per-user run receipt under WEAVELOG_STATE_DIR so audit evidence survives worktree deletion.

10. Steps 7-9 evolved through the approved amendments: .weavelog/runs/<run-id>/tmp is the final worktree-local path; it replaces the earlier .weavelog-tmp and /tmp proposals.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-09-06 sandboxing re-assessment: TASK-60 spike (Colima substrate + zero-dep socket loop) defines the candidate execution substrate; its recommendation feeds this step dispatch plan at activation. Research: ~/.agents/docs/research/2026-09-06-sandboxing-substrates.md (repo mirror lands with TASK-60).

2026-09-13 shipping audit: one selected task is the finish line. Extra context tools, parallelism and automatic merging are not prerequisites. Additional hosts remain future work after real OpenCode usage.

2026-09-13 user correction: this local SDK task is an MVP gate before publication. Independent review means a separate checker, not a requirement to recruit another human. A project on the author's laptop is an accepted test subject.

2026-09-15 blocker: claim attempt from .worktrees/TASK-5 was refused by the lifecycle guard even though git rev-parse reports task/TASK-5. The guard uses the host process cwd (main) rather than the command cwd, so it reports main. No bypass used; TASK-5 remains To Do.

2026-09-15 TASK-88 live SDK run failed at implement before any code or command execution. Receipt: ~/.local/state/weavelog/runs/TASK-88-2026-09-15T05-33-58-956Z.json. Direct read-only OpenCode model calls succeed; current hypothesis is SDK 1.18.30 versus installed OpenCode CLI 1.18.31 version skew. Both tasks remain unfinished; no bypass or version change attempted.

2026-09-15 user approved alignment to OpenCode/SDK 1.18.31 after the live run failed under 1.18.30 SDK with the installed 1.18.31 CLI.

2026-09-15 version-aligned retry still failed at implement: receipt ~/.local/state/weavelog/runs/TASK-88-2026-09-15T05-47-43-622Z.json reports 'fetch failed'. A read-only SDK session-create plus implementer prompt succeeds under 1.18.31, so version skew is not the sole cause. The remaining failure is specific to the controller's full implement-stage run; no task code changed.

2026-09-15 plan amendment approved by user: controller runs use a per-run gitignored temp directory inside the target worktree; no manual external-directory approvals. Requests outside the worktree are rejected and recorded. This is a controller-level boundary, not a process sandbox.

2026-09-15 implementation progress: red-first tests and partial controller support for per-run worktree temp directories plus permission-event rejection are in the TASK-5 worktree. The worker reached its step limit before session wiring and verification. No commit was made; next worker completes the existing partial implementation.

2026-09-18 user-approved scope addition: implement a persisted controller heartbeat/status file within TASK-5 before relying on further long SDK runs.

2026-09-18 user correction: TASK-5 must prove the installed product leaves a persistent per-user audit trail after a task worktree is removed. The controller owns durable receipt writes; workers receive no external-directory permission.

2026-09-18 controlled implementation-ready run against TASK-88 stopped at verify with zero rework and no implementer/reviewer session. Durable receipt: ~/.local/state/weavelog/runs/TASK-88-2026-09-18T02-25-13-027Z.json. npm test: 742 tests, 738 pass, 3 fail; only tests/headroom-compress.test.ts live-proxy assertions failed because health reported up while compression returned fail-open zero metrics. npm run lint and npm run typecheck passed. TASK-88 source diff was unchanged. Next minimal action: resolve the live-proxy test ownership/scope before one new controlled run; do not retry this run blindly.

2026-09-18 human approved a narrow verification exception for exactly three unrelated live Headroom assertions: 2K tokens_saved, CCR hashes, and 10K tokens_saved. All other repository tests remain required. Continue with implementation-ready mode only; no implementer or rework.

2026-09-18 successful implementation-ready proof: TASK-88 reached the human gate with zero rework after focused CLI tests, the approved repository suite excluding exactly three live Headroom assertions, lint, typecheck, and independent diff review all passed. Reviewer: diff-reviewer-glm on openrouter z-ai/glm-5.3-flash. Verdict: APPROVE. Durable receipt: ~/.local/state/weavelog/runs/TASK-88-2026-09-18T02-57-14-833Z.json. Final receipt status: awaiting-human. No implementer ran, no external-directory permission was granted, and no commit or merge occurred.

2026-09-18 independent TASK-5 review initially returned APPROVE-WITH-FIXES. Corrected the modified-file inventory, aligned the stale /tmp wording with the user-approved worktree-local plan amendment, and added SDK event-forwarding coverage. AC #4 remains pending because its WHEN condition starts only after human approval.

2026-09-18 post-review verification: TASK-5-owned runner, managed-adapter, and payload temp-hook suites passed 85/85 with one SDK smoke test skipped; Biome and tsc --noEmit passed. A broader branch-local run that also included tests/cli/index.test.ts reported exactly three failures owned by TASK-88 (the two doctor fixtures and stack-only default path), because TASK-88 is intentionally isolated and unmerged. The successful TASK-88 controller receipt verifies those fixes separately. No assertion was weakened and no cross-task changes were duplicated.

2026-09-18 TASK-5 re-review after bounded fixes: all medium findings resolved; no blocker remains; independent verdict APPROVE. Remaining low-severity observations are deferred to future controller hardening. AC #4 remains pending on the human gate.

2026-09-18 human merge approval accepted the reviewed notes-to-receipt linkage for AC #4: this TASK-5 record names the durable receipt; the receipt identifies TASK-88, result, commands, reviewer identity, evidence, and awaiting-human status. TASK-88 is now Done and merged, and its post-rebase verification remained valid.

2026-09-18 post-rebase integrated verification on top of merged TASK-88: build passed; scoped repository suite 787/787 with one approved skip group; Biome and tsc passed. Human approved merge and all five acceptance criteria are satisfied.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: @conductor
created: 2026-09-15 05:15
---
HITL spec gate approved by user 2026-09-15: TASK-88 selected as the real SDK-run subject and all five acceptance criteria presented in chat.
---

author: @conductor
created: 2026-09-15 05:27
---
HITL plan gate approved by user 2026-09-15: five-step controller-run plan presented in chat.
---

author: @conductor
created: 2026-09-15 05:58
---
HITL plan amendment approved by user 2026-09-15: use a per-run worktree temp directory and automatically reject external-directory requests.
---

author: @conductor
created: 2026-09-15 12:37
---
HITL spec re-gate approved by user 2026-09-15: payload-managed /tmp/weavelog/<run-id> permission setting added to TASK-5.
---
<!-- COMMENTS:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Completed the local SDK workflow proof. The controller now uses worktree-local managed temp state, persists heartbeat history and durable receipts, rejects external-directory requests, supports safe verification-only runs, and gives reviewers recorded command evidence. TASK-88 reached awaiting-human with zero rework and independent approval. After rebasing onto merged TASK-88, build, scoped repository tests 787/787 plus one approved skip group, Biome, and TypeScript passed.
<!-- SECTION:FINAL_SUMMARY:END -->
