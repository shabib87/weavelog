---
id: TASK-7
title: Repair shipped reviewer failure and cost reporting
status: In Progress
assignee:
  - conductor
created_date: '2026-08-24 02:48'
updated_date: '2026-09-15 04:00'
labels:
  - spec-approved
milestone: m-4
dependencies:
  - TASK-11
modified_files:
  - src/tools/reviewer-loop.ts
  - tests/reviewer-loop.test.ts
  - package.json
  - tsconfig.json
  - package-lock.json
priority: high
type: task
ordinal: 6000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Outcome: make the existing reviewer-loop.ts helper report invocation failures and estimated costs honestly before npm release. Why: the audit reproduced exit 0 when every reviewer failed, and retry usage undercounting that hid a threshold breach. Preserve the existing roster and independent review policy. TASK-4 owns the MVP TypeScript workflow through OpenCode; this standalone OpenRouter helper does not automatically load OpenCode agents, skills or hooks. Advanced per-AC review orchestration, multi-rung escalation and lifetime budgeting remain future work.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 WHEN any required reviewer request fails or yields no usable response after the allowed retry THEN the helper exits nonzero and records the failed reviewer in its report without exposing credentials.
- [x] #2 WHEN a reviewer request is retried THEN the reported usage and estimated total include every billed attempt; the audit fixture costing 0.15 cannot report 0.05 or pass a 0.06 threshold.
- [x] #3 IF catalog pricing or usage is unavailable THEN the report names the cost as unknown and does not claim a known zero cost or successful budget check.
- [x] #4 WHEN the CLI describes or evaluates --budget-usd THEN it accurately states and tests its post-run estimated-cost threshold; it does not claim that checking after requests prevents spending.
- [x] #5 WHEN verification runs THEN fake-provider tests cover failures, empty responses, retry accounting, missing cost data and successful reporting without live model spend; existing independent review and human approval remain required.
- [x] #6 WHEN the toolchain contract is inspected THEN package.json declares engines.node exactly ">=22" (bumped from >=20) so the shipped Node floor matches the TS 6 toolchain.
- [x] #7 WHEN package.json is inspected THEN the typescript devDependency is pinned exactly "6.0.3" (no range) so typecheck, build and CI use the same compiler.
- [x] #8 WHEN the typecheck script runs under typescript 6.0.3 THEN tsconfig.json specifies "types": ["node"] and tsc --noEmit passes with no extra flags (TS 6 defaults types to an empty list).
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Refactor src/tools/reviewer-loop.ts: extract a review-loop core with injectable fetch + auth key (CLI main stays a thin wrapper; arg handling unchanged). Sum usage across the initial request and any retry so every billed attempt counts. Collect per-reviewer failures; after the loop, any failed/empty required reviewer exits nonzero (2) and is recorded in the JSON report + stderr. Redact Bearer tokens from error/report text. Missing catalog pricing or missing usage names the cost unknown (costUsd null) and the budget check cannot pass. --budget-usd help text states it is a post-run estimated-cost threshold that does not prevent spend.
2. tests/reviewer-loop.test.ts red-first fake-provider tests (in-memory fetch/auth/plan, no network): all reviewers fail -> nonzero exit + failures recorded; retry accounting 0.10+0.05=0.15 fails a 0.06 threshold (exit 1); missing pricing/usage -> unknown cost, no budget pass; help states post-run check; happy path reports verdicts + summed usage; credential redaction.
3. Toolchain: package.json engines.node ">=22", typescript "6.0.3"; tsconfig.json "types": ["node"]; regenerate package-lock.json (npm install, human-approved); CI already node 22 + npm ci.
4. Verify: npx -y -p typescript@6.0.3 tsc --noEmit, biome check, full node:test suite; then --check-ac each AC with fresh evidence.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-09-13 audit reproduced the failures using memory-only fake fetch/auth/plan inputs, without network or credentials: all reviewers reject -> exit 0; first attempt 0.10 plus retry 0.05 -> reports 0.05 and exits 0 at threshold 0.06. Sources: src/tools/reviewer-loop.ts:150-179,183-192,219. Previous SDK-dependent sequential-review scope is deferred; revive it when one SDK dispatch exists and a demonstrated review failure requires it. The old TASK-6 dependency is unnecessary for this standalone repair.

2026-09-13 scope clarification: the bounded SDK controller now belongs in 0.1.0 under TASK-3/4/5. This task remains a standalone reviewer correctness repair. Do not infer native OpenCode agent, skill or hook integration from this helper's raw API requests.

Claimed via task-flow gate (spec-approved on task branch); worktree .worktrees/TASK-7 branch task/TASK-7. Main duplicate record reverted to HEAD so the task branch copy is canonical.

Validation (fresh, this session, worktree .worktrees/TASK-7): tsc --noEmit clean under repo-local typescript 6.0.3 (types:["node"] set, no extra flags); biome check clean; full suite 735 tests / 731 pass / 3 fail — the 3 are pre-existing on main (tests/cli doctor+check fixtures, unchanged by this diff); npm run build produces dist/cli/index.js. Fake-provider tests (tests/reviewer-loop.test.ts, in-memory fetch/auth/plan, no network spend): all-fail -> exit 2 with failures recorded; empty-after-retry -> failure not placeholder; retry sums 0.10+0.05=0.15 and exits 1 vs 0.06 cap; missing pricing/usage -> costUsd null + budgetIndeterminate, nonzero exit; --help states post-run cap that does not prevent spending; failure records redact Bearer/key strings; happy path reports verdicts + summed usage, exit 0. Observations for human (out of scope): CI runs tests before build, so the compiled-adapters test likely fails on fresh CI runners (needs dist/ or a skip guard); worktree needed npm run build to satisfy it. Note: runReviewLoop exitCode mapping = failures 2 > indeterminate 2 > exceeded 1 > 0.

Review round 1 (glm + deepseek): both APPROVE, minors only. Human chose fix-before-merge. Fixing: (a) billed usage from failed reviewers counted in report/total (attempts that returned usage payloads; hard-failed requests treated as unbilled per API contract), FailureRecord gains billedUsage + costUsd; (b) --budget-usd validated finite, exits 2 before auth/network; (c) negative pricing strings rejected -> unknown cost; (d) ReviewRecord.usage nullable (null when usage unknown, no misleading 0/0/0); (e) tests: partial-usage case, billed-failure case, negative-pricing case, NaN-budget CLI case, all-fail exit asserted as exactly 2.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Repaired reviewer-loop.ts honesty contract and folded in the TS 6 toolchain bump. Core: extracted runReviewLoop with injectable fetch/auth (CLI unchanged at the arg layer); usage now sums every billed attempt including the empty-content retry; reviewer failures and empty-after-retry responses are recorded (model + redacted error) and exit nonzero (2); missing catalog pricing or usage names cost unknown (costUsd null), blocks a budget pass (exit 2), and never claims known-zero; --budget-usd help states it is a post-run threshold that does not prevent spending; budget cap exit 1 on known totals. Toolchain: engines.node ">=22", typescript pinned "6.0.3", tsconfig.json "types":["node"], lockfile regenerated (human-approved npm install). Verified: tsc --noEmit clean (TS 6.0.3), biome check clean, npm run build OK, suite 731/735 with only the 3 pre-existing main failures; 8 new fake-provider tests (no network) cover ACs 1-5.
<!-- SECTION:FINAL_SUMMARY:END -->
