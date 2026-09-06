---
id: TASK-59
title: >-
  Fix biome gate — config schema drift + strict-preset findings block lint gate
  repo-wide
status: To Do
assignee: []
created_date: '2026-09-06 08:59'
labels:
  - harness
dependencies: []
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
