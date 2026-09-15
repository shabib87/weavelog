---
id: TASK-4
title: 'MVP: implement one TypeScript-controlled OpenCode workflow'
status: Done
assignee:
  - '@conductor'
created_date: '2026-08-24 02:48'
updated_date: '2026-09-15 02:55'
labels:
  - spec-approved
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
- [x] #1 WHEN a user selects an eligible task THEN the runner reads it through the Backlog CLI JSON interface and invokes the verified OpenCode SDK in that task's worktree.
- [x] #2 WHEN the run succeeds, fails, times out or is cancelled THEN it records task identity, outcome and evidence location without marking unverified work Done.
- [x] #3 WHEN a permission or hook refuses an operation THEN the runner preserves the refusal and does not bypass it.
- [x] #4 WHEN the runner stops THEN it leaves enough state to inspect the work and recover manually; it does not commit, merge or publish without the existing human approval.
- [x] #5 WHEN the workflow advances THEN TypeScript checks the preceding stage's required evidence, rejects missing or failed checks/reviews, and stops at the existing human approval gate; a prompt instruction alone cannot advance the controller.
- [x] #6 WHEN a task worktree needs a devDependency-provided tool such as difit THEN docs/trd/worktree-discipline.md states that worktrees resolve devDependencies through the parent repo's node_modules and difit must be invoked via npx, so no separate worktree install is required.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add runtime dependency @opencode-ai/sdk pinned exactly to 1.18.30 (matches weavelog.json tools.opencode.version and the installed opencode 1.18.30). HUMAN APPROVAL REQUIRED before npm install. No other new dependency.

2. New library src/runner/ (pure, injectable, testable — no opencode host plugin):
   - task.ts: readTask(id) spawns backlog task view <id> --json; checkEligible(task) reuses task-validate claimGate (status, deps Done, spec-approved, non-empty EARS ACs) and returns identity (id/title/status/deps/ACs).
   - worktree.ts: ensureWorktree(id) resolves .worktrees/<id> via worktree-create.ts through toolScript() (TASK-71 guardrail: no new URL() outside tool-paths.ts); refuses if absent.
   - session.ts: AgentSession interface + SdkSession impl (createOpencode with process.cwd = worktree so the spawned server scopes to the task worktree — TASK-3 finding; session.create; session.prompt with body.agent; session.abort; server.close). Records effective agent/modelID/providerID from the response info.
   - evidence.ts: deterministic ExecRunner (spawnSync) for npm test, npm run lint (biome), npm run typecheck in the worktree; parseReviewVerdict() reads APPROVE/REJECT from the reviewer text.
   - stages.ts: ordered stage machine implement -> verify -> review -> human-gate; TS advance(state, evidence) rejects missing or failed evidence; bounded rework counter (--max-rework, default 1). A prompt instruction alone cannot advance.
   - record.ts: write a run record JSON (task identity, stage, outcome, evidence locations, agent/model identity) to the state dir and the worktree, and append one line to ~/.local/state/weavelog/ledger.jsonl. Never marks the task Done.

3. src/tools/runner.ts CLI: runner <task-id> [--max-rework N] [--dry-run]. Orchestrates the stages. Never commits, merges, publishes, sets ENFORCE_DISABLED, or uses --no-verify. Preserves hook/permission refusals verbatim and stops. Stops at the human merge gate with inspectable state (AC3, AC4).

4. AC6 doc change: add a dated in-place clarification line to docs/trd/worktree-discipline.md (near the difit bullet) stating worktrees resolve devDependencies through the parent repo node_modules and difit must be invoked via npx. No new ADR.

5. Tests: tests/runner-stages.test.ts (pure stage/evidence gating with fake session + fake exec), tests/runner.test.ts (CLI with fake backlog shim + injected fake AgentSession): AC1 task read via JSON + SDK invocation, AC2 outcome/evidence recorded without Done, AC3 refusal preserved and not bypassed, AC4 state left and no commit/merge, AC5 evidence gating rejects missing/failed checks and stops at the human gate. Plus one real SDK bootstrap smoke (createOpencode + session.create + abort/close in the worktree) as the SDK-invocation evidence — full live agent run is TASK-5.

6. Verify: tsc --noEmit, biome check, full node:test suite, architecture frontmatter check for the TRD change, privacy scan of git diff main.

Deferred (do NOT build): general scheduler, new host, provider framework, auto-merge; retry budget/escalation (TASK-6), decision CLI (TASK-8), parallel/crash recovery (TASK-9), merge gate (TASK-10), loop commands (TASK-81).
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-09-13 shipping audit: remove speculative abstraction/scheduler/watchdog/callback/milestone requirements from this first runner. Revive those capabilities in their existing tasks only when usage demonstrates the need. Human spec and plan approval still precede implementation.

2026-09-13 user correction: include this bounded controller in the MVP. Reuse configured agents and skill instructions through OpenCode rather than treating the standalone OpenRouter reviewer helper as a native subagent. Record effective agent/model/profile identity. Future scheduling and additional hosts stay deferred.

2026-09-14 TASK-4 implementation complete (conductor; TDD red-first; 2 independent diff reviewers both APPROVE after one fix round).

Delivered (branch task/TASK-4):
- src/runner/{types,evidence,stages,task,record,controller,session}.ts + src/tools/runner.ts CLI: runner <task-id> [--max-rework N] [--stage-timeout-ms N] [--dry-run].
- Stage machine implement -> verify -> review -> human-gate; TypeScript evaluateStage gates every advance (review requires literal APPROVE; verify requires all-zero exit codes; missing evidence refuses). Bounded rework (default 1).
- Reads the task via backlog task view --json; eligibility reuses task-validate.claimGate; resolves the task worktree; SDK session created with cwd=worktree (chdir before createOpencode, restored on close); records agent/providerID/modelID.
- Refusals (hook/permission) preserved verbatim and terminating; no ENFORCE_DISABLED/--no-verify/commit/merge/push anywhere; never marks the task Done; stops at the human merge gate.
- Run record JSON under <stateDir>/runs/ + one ledger.jsonl line (existing schema). SIGINT/SIGTERM -> AbortController -> cancelled run recorded.
- docs/trd/worktree-discipline.md: dated clarification — worktrees resolve devDependencies via the parent repo node_modules; difit via npx.
- package.json: +@opencode-ai/sdk 1.18.30 (exact); package-lock updated. No other dependency.

Evidence:
- AC1: unit tests assert the task is read from JSON and the session starts with cwd=worktree; live SDK smoke (RUNNER_SMOKE=1) created a real session and closed cleanly (605 ms), pass 1/1.
- AC2: tests assert outcome/evidence/identity recorded on success, failure, timeout, cancel, and session-start failure; record on disk; no Done.
- AC3: refusal tests (agent prose + command stderr) stop with outcome refused and preserve the text; grep confirms no bypass.
- AC4: test asserts no commit/merge/push command runs and finalStage=human-gate with outcome awaiting-human; record + worktree left in place.
- AC5: tests prove a REJECT triggers one bounded rework, a non-APPROVE/missing verdict fails, and prompt-only prose cannot advance; advancement is code-gated.
- AC6: docs/trd/worktree-discipline.md dated clarification present (diff +3 lines).

Verification (fresh, this worktree): tsc --noEmit clean; biome check 62 files clean; full suite 723/727 pass, 3 fail = pre-existing cli doctor + cli check (identical 692/695 baseline on main), 1 skipped = env-gated SDK smoke; architecture frontmatter 27/27; privacy scan of new/changed files clean.

Review: diff-reviewer-glm APPROVE; diff-reviewer-qwen APPROVE (round 2). Round-1 findings fixed: --max-rework positional bug; AC2 timeout/cancel; last-verdict parsing; exit-0 refusal false positive; maxRework default 1.

Deviations/limitations: run record written only under the state dir, not mirrored into the worktree (avoids an untracked artifact in the task worktree that could be committed at merge; the record carries worktreePath as the evidence location). Full live agent run (real model calls) deferred to TASK-5; SDK response shapes use typed casts with TASK-3 as the behavior proof. Headroom live-proxy test flaked once in a full-suite run; passes in isolation and on re-run (environment flake).
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: @conductor
created: 2026-09-14 05:23
---
HITL spec gate approved by user 2026-09-14 (6 ACs incl. AC #6 TRD clarification: dated in-place note, no new ADR).
---
<!-- COMMENTS:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented one bounded TypeScript controller for a selected Backlog task. src/runner/ (types, evidence, stages, task, record, controller, session) plus the src/tools/runner.ts CLI run implement -> verify -> review -> human-gate through the pinned OpenCode SDK (@opencode-ai/sdk 1.18.30): read the task via backlog task view --json, reuse the claim gate for eligibility, run the SDK with cwd = the task worktree, gate every advance on TypeScript-checked evidence (deterministic test/lint/typecheck exit codes; fresh-context reviewer with a parsed final VERDICT), bound rework to 1, preserve hook/permission refusals, write a run record + one ledger line, and stop at the human merge gate without committing, merging, or marking work Done. Verified: tsc --noEmit clean, biome check clean, 723/727 tests (3 pre-existing cli doctor/cli check failures identical on main), live SDK session smoke passed, architecture frontmatter 27/27, privacy scan clean; independent diff review APPROVE (glm + qwen). Adds @opencode-ai/sdk 1.18.30 and a dated devDependency/difit clarification in docs/trd/worktree-discipline.md.
<!-- SECTION:FINAL_SUMMARY:END -->
