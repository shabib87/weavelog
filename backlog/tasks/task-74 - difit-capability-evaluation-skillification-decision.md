---
id: TASK-74
title: Spike — difit capability evaluation + two-station HITL protocol
status: To Do
assignee: []
created_date: '2026-09-07 16:01'
updated_date: '2026-09-07 17:18'
labels:
  - harness
  - spec-approved
milestone: m-4
dependencies: []
references:
  - 'https://github.com/yoshiko-pg/difit'
documentation:
  - docs/architecture/worktree-discipline.md
type: spike
ordinal: 60500
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
difit (yoshiko-pg/difit, MIT) is an npx-invoked tooling dep (not a package.json dependency) used ONLY for merge-gate diff presentation, and its recorded contract in docs/architecture/worktree-discipline.md is stale: the 2026-09-01 'display-only, comments in localStorage, no export API' finding is outdated — difit v4.0.0-5.0.12 (current 5.0.12, 2026-08-29) shipped a programmatic comment round-trip (difit comment add|get|resolve; GET /api/comments-output + /api/comments-json; POST /api/comment-imports; --comment injection; SIGINT stdout dump), a --background JSON contract (port/url/pid, no stop verb — kill pid), --pr mode, and upstream agent skills (difit-review, difit-dev).

OUTCOME: a decision-ready evaluation of which difit capabilities weavelog adopts so difit becomes the human-agent communication channel at exactly TWO conductor stations, per the HITL design bar (neither full autonomy nor rubber-stamp review):
- PLANNING station: plan/spec review — rendered artifact is the backlog task file diff on the task branch (the spec IS the task).
- MERGE station: code review — task branch vs main, branch-first invocation (additions render as additions), pre-synced with main MANUALLY in experiments (TASK-50 automation does not exist yet and owns that wording).
Station ownership is conductor-only: subagents never invoke difit; the future skill stays agent-readable but both stations wire to conductor gates.
Protocol: inner loop completes -> conductor auto-opens difit in the browser -> human reviews -> approve, or kick back with comments -> comments collected programmatically and fed back to the agent as ONE batch prompt -> inner loop re-runs.

DELIVERABLES (evidence, not implementation):
1. Dated capability inventory at docs/research/YYYY-MM-DD-difit-capability-inventory.md (experiments recorded as a section of the same doc), enumerating against the EXACT resolved difit version recorded per experiment (npx is unpinned): CLI flags; comment round-trip (endpoints + CLI verbs); --background JSON contract; lifecycle (port fallback, pid termination, orphaned-server reaping after a crashed conductor round, --clean per round); the localhost API security posture (bind address, no-auth reality, who can read diffs and inject comments — prompt-injection surface for the batch-prompt path); the APPROVE mechanism (difit has no approve verb — evaluate resolve-all, empty comment-get, and separate decision-CLI options for machine-detecting human approval); macOS compatibility; --no-open URL handoff as the headless fallback; upstream difit-review/difit-dev skills each with a weavelog-fit verdict (adopt/distill/reject); rejection rationales for non-adopted capabilities (expected: --pr mode).
2. Empirical experiments (merge station, stdin round-trip, planning station) run in a scratch worktree, each pass/fail with exact commands and root cause on failure.
3. Implementation-shaped EARS ACs for the follow-up implementation task (harness skill + src/tools automation: auto-open, manual-then-automated pre-sync, pid lifecycle + orphan reaping, comment-get batch prompt, approve detection, branch-first direction, --clean per round, secret scrubbing, difit version pinning) recorded in the final summary; the follow-up task itself is created at spike finalization with human sign-off.
4. Correction of the stale 'display-only / no export API' claim in the difit bullet of docs/architecture/worktree-discipline.md ONLY (pre-sync wording stays owned by TASK-50 to avoid a doc-edit collision).
5. TASK-8 refinement via backlog CLI: INVESTIGATION SCOPE block removed (superseded by this spike), stale 'difit not installed today; fallback = terminal' claim reconciled to the installed-via-npx reality, and a TASK-8 depends-on-TASK-74 edge recorded.

OUT OF SCOPE: implementing the skill or src/tools automation (follow-up task); --pr mode adoption; adding difit as a package.json dependency; agent roster changes; TASK-8 milestone/label changes (TASK-8 description/scope/deps ARE in scope; its milestone/labels are not).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 WHEN the spike completes THEN a dated capability inventory exists at docs/research/YYYY-MM-DD-difit-capability-inventory.md enumerating, against the exact resolved difit version recorded per experiment: CLI flags, comment round-trip (endpoints + CLI verbs), --background JSON contract, lifecycle behaviors (port fallback, pid termination, orphaned-server reaping, --clean), the localhost API security posture including the prompt-injection surface of the comment-import path, the approve-detection mechanism evaluation, macOS compatibility, the --no-open headless fallback, and the upstream difit-review/difit-dev skills each with an adopt/distill/reject verdict, every fact source-attributed with access dates, plus rejection rationales for non-adopted capabilities (expected: --pr mode)
- [ ] #2 WHEN the merge-station experiment runs in a scratch worktree THEN the --background JSON (port/url/pid) is parsed programmatically, kill-by-pid termination is verified, and per-round --clean state reset is recorded with exact commands; IF pid parsing or kill-by-pid fails THEN the failure and observed recovery behavior are documented
- [ ] #3 IF a synthetic unified diff is piped to difit via stdin THEN a comment added by a human in the browser (gold path) — or via CLI/API injection when unattended, with the method recorded — is collected via difit comment get --format json and the round-trip result is recorded pass/fail with root cause on failure
- [ ] #4 WHEN the planning-station experiment presents the TASK-74 backlog task file diff itself (task branch vs main, pre-synced manually) THEN comment collection succeeds on that rendering, or the failure is documented with root cause and a fallback rendering is evaluated
- [ ] #5 IF any round-trip or lifecycle experiment fails THEN a decision-ready recommendation is recorded — alternative path (GET /api/comments-output, SIGINT stdout dump, --comment injection), version pin, or blocker verdict with rationale — and no follow-up AC is drafted on unverified behavior
- [ ] #6 WHEN the spike concludes THEN implementation-shaped EARS acceptance criteria for the follow-up implementation task (harness skill + src/tools automation covering auto-open, pre-sync, pid lifecycle with orphan reaping, comment-get batch prompt, approve detection, branch-first direction, --clean per round, secret scrubbing, difit version pinning) are recorded in the final summary
- [ ] #7 WHEN evidence contradicts docs/architecture/worktree-discipline.md THEN the stale display-only / no-export-API claim in the difit bullet is corrected in this task so the single-source doc matches verified difit 5.x behavior, scoped to that claim only (pre-sync wording remains TASK-50-owned)
- [ ] #8 WHEN the spike concludes THEN TASK-8 is refined via backlog CLI: its INVESTIGATION SCOPE block is removed as superseded, its stale difit-not-installed claim is reconciled, and a TASK-8 depends-on-TASK-74 edge is recorded
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Tests and lint pass with fresh output in the worktree
- [ ] #2 Worktree is clean (no uncommitted changes)
- [ ] #3 Branch is rebased on main and green
- [ ] #4 All acceptance criteria checked with fresh evidence (one at a time, never batched)
<!-- DOD:END -->
