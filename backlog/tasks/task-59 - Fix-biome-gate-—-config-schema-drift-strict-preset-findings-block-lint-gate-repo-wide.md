---
id: TASK-59
title: >-
  Fix biome gate — config schema drift + strict-preset findings block lint gate
  repo-wide
status: In Progress
assignee:
  - conductor
created_date: '2026-09-06 08:59'
updated_date: '2026-09-07 17:35'
labels:
  - spec-approved
milestone: m-7
dependencies: []
modified_files:
  - package.json
  - weavelog.json
  - src/tools/pin-hygiene.ts
  - src/cli/index.ts
  - src/tools/task-validate.ts
  - tests/pin-hygiene.test.ts
  - tests/cli/index.test.ts
  - docs/architecture/worktree-discipline.md
  - docs/architecture/backlog-lifecycle.md
  - payload/AGENTS.md
  - payload/skills/binary-doc-conversion/SKILL.md
priority: high
ordinal: 47000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Outcome: npm run lint exits 0 with biome 2.5.5 on the weavelog repo so AC-style gate batteries can include biome again. Why: the biome gate is broken repo-wide and PRE-EXISTING (not caused by TASK-58): on main at e30a22e, biome 2.5.5 fails config parsing ('Biome exited because the configuration resulted in errors', suggests biome migrate --write), and in a clean worktree the same binary flags style findings (noExplicitAny, noNonNullAssertion, useTemplate, noUnusedImports, noImplicitAnyLet, noUnusedFunctionParameters) in files BYTE-IDENTICAL to main (verified src/reviewer-loop.ts:83) — evidence the recommended preset/schema drifted under the ^2.5.5 caret pin. TASK-58's AC#4 biome clause was waived for this task by explicit human decision at the 2026-09-06 merge gate ('Merge' with biome follow-up). Scope: run biome migrate --write (or pin exact version + update config to a passing schema), decide each finding class (fix in code vs configure rule off with recorded rationale), land lint green WITHOUT weakening security/correctness rules, re-run the full gate battery (npm test, tsc, biome, privacy-audit) green. Out of scope: refactors beyond lint fixes; any dependency upgrade beyond biome itself.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 WHEN biome migrate/config updates land THEN npm run lint SHALL exit 0 on the repo root
- [ ] #2 IF a lint finding is suppressed by config THEN the rule change SHALL carry a recorded rationale in the task notes (no silent weakening of correctness rules)
- [ ] #3 WHEN the full gate battery re-runs THEN npm test, tsc --noEmit, biome, and scripts/privacy-audit SHALL all exit 0
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
1. Verify biome state in worktree (already green on e523dfb via 14e72d5 config rewrite); document root cause in notes. 2. Pin all direct deps in package.json to exact lockfile versions (pins only, zero bumps); verify npm ci. 3. Add difit: resolve current version, pin npx difit@X in docs/architecture/worktree-discipline.md, add manifest key + pointer check in stack-check.ts. 4. Reconcile manifest path references (AGENTS.md/label table -> real ~/.agents/stack-versions.json); bootstrap the missing home manifest on this machine from live tool versions. 5. Add pin-hygiene check to weavelog check (fail on ^/~/* direct deps + missing lockfile), wired into --pre-commit path. 6. Unit tests for new checks per tests/ conventions. 7. Full battery green (npm test, tsc --noEmit, biome, scripts/privacy-audit); record rationales for AC#2/#6; check ACs one at a time with fresh evidence.

PLAN CORRECTION (AC#7, discovered during implementation): ~/.agents/stack-versions.json was DELETED DELIBERATELY by TASK-45 step 3.3 (post-flip terminal state: the live stack manifest is weavelog.json at repo root; docs/cli.md documents both). Creating the home manifest would undo a ratified, AC-verified migration decision — so AC#7 is satisfied by RECONCILING REFERENCES instead: label-table mentions of docs/architecture/stack-versions.json updated to weavelog.json (payload/AGENTS.md, docs/architecture/backlog-lifecycle.md x2, docs/architecture/worktree-discipline.md, payload/skills/binary-doc-conversion/SKILL.md), task-validate.ts HARNESS_PATH_RULES gains weavelog.json (stack manifest current name; stack-versions.json kept for harness-dev legacy), and the legacy stack-check.ts main() stays import.meta.main-guarded with no live wiring (the com.weavelog.check plist runs weavelog check --stack-only which reads weavelog.json).
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Root cause (AC#1): biome gate was already repaired on main by 14e72d5 (TASK-56 cleanup pass: biome.json rewritten tab->space/80 + naming policy, repo reformatted); lint exits 0 at e523dfb with biome 2.5.5 (47 files, 0 diagnostics). No migrate needed. Rationale AC#2: NO lint rule was suppressed or weakened in this task — biome.json is unchanged in this diff; the strict-preset findings cited at task creation were resolved by 14e72d5's config+format pass, not by turning rules off. Rationale AC#6 (check-not-pin for backlog.md + markitdown): both are already manifest-tracked in weavelog.json (channel npm/pipx, version, check id) and drift-detected by weavelog check/update/doctor + the launchd com.weavelog.check plist; their install channels are TASK-62 (pipx->uv) / TASK-63 (supply-chain) territory, so pinning install commands here would collide — decision: keep check-not-pin, revisit under TASK-62/63.

Implementation: package.json all 5 direct deps exact-pinned (biome 2.5.5, @types/node 22.20.1, tsx 4.23.1, typescript 5.9.3, yaml 2.9.0 — pins only, package-lock.json untouched, npm ci clean 0 vulnerabilities). difit 5.0.12 resolved via npm registry read, added to weavelog.json (check id difit.pointer), doc pinned npx difit@5.0.12 in worktree-discipline.md, pointer check checkDifitPointer wired into stackVersionChecks (env seam WEAVELOG_DIFIT_DOC for tests). Pin-hygiene guardrail: new src/tools/pin-hygiene.ts (checkPinHygiene pure checker: fail on ^/~/* direct deps + missing lockfile; pinHygieneForDir scopes to weavelog-managed repos via weavelog.json marker so foreign repos are skipped, matching the pre-commit hook presence-guard philosophy). Wired: weavelog check (deps.pin-hygiene result both modes), weavelog check --pre-commit (gate runs BEFORE task-validate, exit 1 naming offenders). Tests: tests/pin-hygiene.test.ts (16) + tests/cli/index.test.ts (+8: managed-fail, nolock-fail, foreign-skip, managed-ok, difit.pointer fail/pass via CLI) + harness fix: test run() now uses resolved TSX_LOADER path so cwd-based spawns work in foreign dirs. Battery fresh evidence: npm test 621 tests/620 pass/0 fail/1 pre-existing skip; tsc --noEmit clean; biome check exit 0 (47 files, after auto-fixing useLiteralKeys + import order in new code); scripts/privacy-audit exit 0.

Post-fix + post-rebase evidence (commit 96bf672, rebased onto main 38de20f): npm test 625 tests/624 pass/0 fail/1 pre-existing skip; tsc --noEmit 0; npm run lint (biome) 0 across 47 files; scripts/privacy-audit 0. Diff-reviewer (kimi, independent) verdict APPROVE-WITH-FIXES — all 4 code fixes applied with regression tests: (1) checkDifitPointer anchored match, no false-pass on version prefix collision (difit@5.0.12 vs 5.0.123); (2) isExactVersion fails closed on non-string specs instead of throwing; (3) optionalDependencies now scanned; (4) useLiteralKeys fix manifest.tools.difit. Rebase verified: TASK-49 files no longer in diff, worktree clean. Note for post-merge: payload/AGENTS.md changed => run weavelog sync + restart session (self-modifying config merge, per worktree discipline). Aside: the rtk lint wrapper misreports biome as failing (parses lint output as ESLint JSON) — false alarm unrelated to this task's gates.

Merge-gate follow-up (human decision at difit review): difit upgraded from registry-pinned npx to exact-pinned devDependency (5.0.12, lockfile-verified: zero existing versions changed, zero keys removed — 42 original packages intact, +339 packages all in difit's subtree; lockfile reindent tabs->spaces inherited from 14e72d5's package.json format flip, never regenerated until now). Global install removed per explicit human approval (npm uninstall -g difit, 328 packages); merge-gate invocation npx difit@5.0.12 now resolves locally from node_modules inside the repo, via npx cache outside. Doc updated (worktree-discipline difit bullet notes the devDependency). Commit ae85b69.
<!-- SECTION:NOTES:END -->
