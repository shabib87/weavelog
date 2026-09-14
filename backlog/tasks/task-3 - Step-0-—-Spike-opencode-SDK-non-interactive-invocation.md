---
id: TASK-3
title: 'MVP: prove one OpenCode SDK invocation'
status: Done
assignee:
  - '@conductor'
created_date: '2026-08-24 02:48'
updated_date: '2026-09-14 05:17'
labels:
  - spec-approved
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
- [x] #1 WHEN the probe runs against the pinned supported SDK version THEN it creates a session, sends a task and records a usable result with the actual request and response shape.
- [x] #2 WHEN the task times out, errors or is cancelled THEN execution terminates through a verified abort/close path and records the failure without claiming completion.
- [x] #3 WHEN the SDK task attempts an operation forbidden by the installed profile THEN the real hook or permission boundary refuses it and records evidence.
- [x] #4 WHEN the probe concludes THEN its version, commands, results and limitations are recorded in this task, providing the inputs for TASK-4 without requiring a new research document or milestone.
- [x] #5 WHEN the approved V4.1 Flash roster fold is applied THEN deepseek/deepseek-v4.1-flash appears in weavelog.json models and as the payload small_model A/B slot, the worker seats and escalation ladder stay unchanged, the 2026-09-11 hold note is tracked and updated, the docs agree, and no live seat is reassigned
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Confirm pinned SDK: latest @opencode-ai/sdk is 1.18.30, matches installed opencode 1.18.30; bump weavelog.json opencode.version 1.18.29 -> 1.18.30 inside this worktree. 2. Recon the 1.18.30 SDK surface (session create/prompt, event stream, abort/close, permission + hook interception) via researcher (official docs) and scout (installed roster/profile/hooks). 3. Build a throwaway probe in a disposable local project that creates a session, dispatches a bounded task to a roster agent, and records the real request/response shape (AC1). 4. Prove the failure path: timeout/error/cancel terminates via abort/close and records failure without claiming completion (AC2). 5. Prove an installed-profile-forbidden operation is refused by the real hook/permission boundary and capture that evidence (AC3). 6. Record SDK version, exact commands, results, and limitations in TASK-3 notes as inputs for TASK-4 (AC4). 7. Verify every AC with fresh command output, then finalize.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-09-14 TASK-3 spike complete (conductor; researcher + scout + implementer subagents). No new research doc.

SDK pin and setup
- Verified latest @opencode-ai/sdk = 1.18.30, equal to the installed opencode 1.18.30 (arm64 macOS, Node v22.23.1). Only prior local copy was sdk 1.18.29.
- Upgraded the live profile ~/.config/opencode/@opencode-ai/{plugin,sdk} 1.18.29 -> 1.18.30, exact-pinned in ~/.config/opencode/package.json (plugin@1.18.30 pins sdk@1.18.30 exactly).
- Bumped weavelog.json opencode.version 1.18.29 -> 1.18.30 (this worktree); re-establishes pin/installed agreement.
- Throwaway probes live under $TMPDIR/opencode/sdk-probe-t3 (probe-bootstrap, probe-llm, probe-c, probe-c2, probe-c3, probe-c4, probe-c5 .mjs + *.out.json). No repo files changed except weavelog.json.

AC1 PROBE A (happy path)
- createOpencode({hostname,port}) embedded server; client.app.agents() returned 25 agents including scout, implementer, qa, researcher.
- session.create({body:{title}}) -> Session. session.prompt({path:{id}, body:{parts:[{type:"text",text}], agent:"scout"}}) -> { data:{ info, parts }, request, response }.
- data.info keys: parentID, role, mode, agent, path, cost, tokens, modelID, providerID, time, finish, id, sessionID. role=assistant, finish=stop, tokens populated, cost populated.
- Assembled assistant text = "PROBE_OK" (contains_PROBE_OK TRUE).
- Event sequence: server.connected, session.created, session.updated, message.updated, message.part.updated, session.status, session.diff, message.part.delta, session.idle.

AC2 PROBE B1/B2 + close (failure, abort, close)
- B1 invalid model: session.prompt did NOT throw; returned { error:{ name:"UnknownError", data:{ message, ref } } } with no data. Reads as failure, not success.
- B2 abort at 2.5s: session.abort({path:{id}}) -> { data:true, status:200 }. The pending session.prompt promise RESOLVED (did not reject, did not hang) with data.info.error = { name:"MessageAbortedError", data:{ message:"Aborted" } }, parts:[], tokens/cost 0. No session.error; session.idle fired after abort. Session still retrievable; messages count 2.
- Close: server.close() terminated the spawned opencode child in 127 ms (pgrep before present, after absent).

AC3 PROBE C4 (real installed enforcement boundary)
- Controlled agent probe-writer (permission.edit allow-all) instructed to write ~/.config/opencode/.probe-t3-tmp.md.
- Result: the write tool part ended status=error with error text: "Blocked: ~/.config/opencode/.probe-t3-tmp.md is a live harness file — edit the tracked repo copy under ~/.agents/config/ instead, then materialize with `bun ~/.agents/bin/src/config-sync.ts`. Intentional one-off: set ENFORCE_ALLOW_LIVE_EDIT=true."
- target_exists_after = FALSE (the write did not land). No permission.updated event.
- Adapter audit recorded a real installed-hook receipt in ~/.local/state/weavelog/adapter-audit.jsonl: {"adapter":"enforce","outcome":"gate-refusal","sessionID":..,"callID":..,"error":"Blocked: ... is a live harness file ..."}. This is Hook 8 (isLiveHarnessPath) from the installed weavelog@0.1.0 dist/hooks/enforce.js refusing an SDK-invoked operation.

Corrections and limitations (inputs for TASK-4)
- Permission deny globs match the WORKTREE-RELATIVE path: the opencode 1.18.30 edit tool calls permission with path.relative(instance.worktree, filePath). Absolute deny globs and **/backlog/** did not match; a relative pattern such as blocked/** matches. (PROBE C3)
- The installed implementer agent refused a denied write by PROSE ("STATUS: BLOCKED") before the permission engine fired. Agent prose is not boundary evidence; the hook refusal (C4) is.
- PROBE C5: Hook 7 (backlog lifecycle gate) did NOT fire in the SDK-spawned server even though the bash tool ran with the disposable project cwd on branch main. The plugin evaluates process.cwd() of the opencode server process, which is not the project worktree. Therefore the lifecycle gate's main-branch assumption does not bind under SDK-spawned servers — the TASK-4 controller must not rely on it as-is.
- Config permission overrides MERGE with opencode.jsonc (a passed bash:deny merged; all 25 installed agents stayed loaded). A config-supplied agent definition is added to the roster.
- createOpencodeClient has NO default baseUrl (baseUrl null; app.agents() fails "Failed to parse URL from /agent") — pass baseUrl explicitly. createOpencodeServer defaults to port 4096; port 0 is coerced to 4096, not an ephemeral port.
- session.idle is a completion signal (fires on normal finish, after abort, and after a prose-refusal turn), not an outcome signal. Read the final message.updated.info for finish vs error.
- Not tested: mid-stream abort after output has streamed; repeated-run flakiness for the port/close checks (single runs).

2026-09-14 TASK-3 folded scope — DeepSeek V4.1 Flash roster addition (human-approved option 1: roster + small_model A/B only; no seat change).

Changes (all in this worktree)
- weavelog.json models: added deepseek/deepseek-v4.1-flash (now 8-model list; deepseek-v4-flash-0731 retained).
- payload/config/opencode.jsonc: small_model -> openrouter/deepseek/deepseek-v4.1-flash; roster comment updated to note the manual A/B slot and the open hold.
- docs/adr/0004-model-selection-benchmark-policy.md: append-only Addendum 2026-09-14 recording the roster-list addition (decision unchanged; worker seats and escalation ladder unchanged; ADR-007 supersession unaffected).
- docs/trd/model-routing.md: small_model line + manifest models list updated to eight, citing the A/B slot and the hold.
- docs/cli.md: models list and small_model description updated.
- docs/research/2026-09-11-deepseek-v4.1-flash-evaluation-hold.md: copied from the main working tree (it was untracked) into this branch and given a dated "Update 2026-09-14 — roster fold via TASK-3" section. Status stays open. This removes the stray untracked doc.
- No worker-seat change: payload/config/agents/{implementer,scout}.md remain on deepseek-v4-flash-0731. No escalation-ladder change.

Live drift / blocker (not forced)
- `weavelog sync` refuses: opencode.jsonc is a conflict (both tracked and live changed; the live config has diverged) and agents/{implementer,scout}.md are local edits (live already v4.1-flash). No --force was used. The repository is authoritative; the human reconciles the live copies. Recorded in the research note update.
- src/hooks/enforce.ts LEARN_MODEL and src/tools/openrouter-snapshot.json were left unchanged (no seat change; snapshot refresh is the weekly sweep's job).

Verification (fresh, this worktree)
- `npx tsc --noEmit`: clean.
- `npx biome check`: 51 files, no findings.
- Full suite `node --import tsx --test "tests/**/*.test.ts"`: 695 tests, 692 pass, 3 fail, 0 skipped. The 3 failures (cli doctor, cli check) are PRE-EXISTING baseline failures — verified identical on main (692/695; the same three failing tests across two suites). No new failure introduced.
- The compiled-adapters test failed initially only because a fresh worktree has no dist/; `npm run build` (tsc -p tsconfig.build.json) then 5/5 pass. dist/ is gitignored.
- Frontmatter: architecture schema 27/27 valid (trd+adr+prd); the research note validates (ok true).
- Privacy scan of `git diff main`: no absolute home paths, emails, machine temp paths, or secret patterns.

AC5 evidence: deepseek/deepseek-v4.1-flash present in weavelog.json models and payload small_model; worker seats and ladder unchanged; hold note tracked + updated; docs agree; no live seat reassigned.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
TASK-3 spike complete. Proved one bounded OpenCode SDK invocation against @opencode-ai/sdk 1.18.30 (== installed opencode 1.18.30): session create + named-agent prompt returned a usable result with the real request/response shape (AC1); invalid-model error, abort-on-cancel (pending prompt resolves with MessageAbortedError, no hang) and a verified server close (AC2); the real installed Hook 8 refused a live-harness write and logged a gate-refusal receipt (AC3); version/commands/results/limitations recorded as TASK-4 inputs (AC4). Folded the approved DeepSeek V4.1 Flash roster addition (small_model A/B slot; worker seats and ladder unchanged) with an ADR-004 append-only addendum, TRD/cli docs, and the now-tracked 2026-09-11 hold note (AC5). Verified: tsc clean, biome clean, 692/695 tests (3 pre-existing failures identical on main), architecture frontmatter 27/27, research note valid, privacy scan clean; independent review APPROVE. Live implementer/scout seat reconciliation remains a manual human step (weavelog sync refused; not forced).
<!-- SECTION:FINAL_SUMMARY:END -->
