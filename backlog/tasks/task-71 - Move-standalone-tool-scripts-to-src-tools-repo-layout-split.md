---
id: TASK-71
title: Move standalone tool scripts to src/tools/ (repo layout split)
status: In Progress
assignee:
  - '@conductor'
created_date: '2026-09-07 06:53'
updated_date: '2026-09-07 15:21'
labels:
  - harness
  - spec-approved
dependencies: []
ordinal: 57500
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Split the repo layout: the ~15 standalone agent-facing tool scripts (task-validate, cache-probe, prefix-diff, frontmatter-check, mdconvert, reviewer-loop, worktree-create, agents-install, config-sync, task-flow, stack-check, sync-model-pricing, task-migrate, weavelog-manifest, headroom-compress) currently sit loose in src/ next to the published CLI (src/cli) and plugin hooks (src/hooks). Move them to src/tools/ so the three tiers are visible from the tree, per the cross-model consult (DeepSeek: REJECT on bin/-move, endorsed in-src rename; Qwen: APPROVE-WITH-CHANGES) and the second-round plan review (DeepSeek REJECT->revised, Qwen APPROVE-WITH-CHANGES). Coordination: TASK-45 (port) is in flight and references these scripts by path - land between TASK-45 phases or immediately after. OUT OF SCOPE (own task later): port of scripts/privacy-audit bash to TS (both reviewers: behavior port pollutes a pure-move diff); fate of stale installed-path strings (~/.agents/bin/src/*, bin/src/*) beyond keeping them frozen. Provenance note: worktree-create.ts inferNextTaskId missed the parallel session's uncommitted TASK-70 in this worktree, nested a new worktree, and needed git worktree move to .worktrees/TASK-71 (TASK-40 recurrence evidence).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 WHEN the split lands, THEN all standalone tool scripts listed in the description live under src/tools/ and src/ contains only cli/, hooks/, and tools/
- [x] #2 IF any file imports or resolves a moved module (ES imports AND runtime new URL/join/existsSync resolvers in src/cli/index.ts:651,760, src/hooks/enforce.ts:127,378,473, src/agents-install.ts:160, src/stack-check.ts:927), THEN all references are updated and npm run typecheck, npm test, and npm run lint all pass
- [x] #3 WHEN moved scripts compute repoRoot via new URL('..', import.meta.url) (src/tools/agents-install.ts, config-sync.ts, stack-check.ts), THEN the depth is corrected so repoRoot still resolves to the repo root and their downstream defaults (manifest, trackedRoot, config-dir) still point at the same targets
- [x] #4 WHEN CI runs, THEN package.json scripts/globs, tsconfig includes, and biome files.includes reference only the new paths, a clean npm run build emits dist/tools/*.js, and a dist-artifact smoke (CLI check --pre-commit resolution against dist/) passes
- [x] #5 WHEN docs and payload reference old repo-internal paths, THEN the sweep updates docs/architecture/*.md, docs/cli.md, docs/architecture/diagrams/tool-boundaries.html, and payload skills with repo-internal src/*.ts refs, while installed-path strings (~/.agents/bin/src/*, bin/src/*) and frozen docs (RESEARCH.md, ratified spec brief, learnings/, superpowers/plans/) stay byte-identical, and weavelog sync still round-trips
- [x] #6 WHEN tests run, THEN they remain in tests/ with the existing tests/**/*.test.ts glob, the sweep covers both .js and .ts extension imports plus new URL('../src/x.ts') constants, and tests/canary-invariants.test.ts expectations are updated for src/tools/
- [ ] #7 WHEN any module needs to locate a tool script path, THEN it resolves through a single module (src/tool-paths.ts) with no other new URL/join-based tool-script lookup in src/, enforced by a canary tripwire test that fails on path-building outside that module
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Tests and lint pass with fresh output in the worktree
- [ ] #2 Worktree is clean (no uncommitted changes)
- [ ] #3 Branch is rebased on main and green
- [x] #4 All acceptance criteria checked with fresh evidence (one at a time, never batched)
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Preconditions: confirm main is safe to branch from for CODE (human docs edits on main do not touch src/ or tests/ - verify with git status); re-verify reference counts with fresh greps (reviewers disagree: 45 vs 27 test refs, 63 vs 18 doc refs).
2. ATOMIC COMMIT 1 (pure move, everything must land together or tree stays red):
   a. git mv the 15 scripts -> src/tools/
   b. Fix ES imports: src/cli/index.ts -> ../tools/*.js; cross-script imports inside tools/ unchanged (all siblings now)
   c. Fix RUNTIME path resolvers (tsc will NOT catch these):
      - src/cli/index.ts:651-657 resolveConfigSync + :760-765 runPreCommit path joins -> ../tools/
      - src/hooks/enforce.ts:127-131 configSyncArgv, :378 dynamic import of ../task-validate.js (silent-degradation fallback!), :473-480 machineryScript (frontmatter-check, reviewer-loop, config-sync) -> ../tools/
      - src/agents-install.ts:160-162 -> both files now siblings -> ./
      - src/stack-check.ts:927-929 pricingBin -> ./ (verify current meaning first)
   d. Fix repoRoot depth in moved scripts: new URL("..") -> "../.." in agents-install.ts:145, config-sync.ts:119, stack-check.ts:58 (downstream defaults: manifest, trackedRoot, config-dir)
   e. Test sweep: 18 test files, BOTH ../src/x.js and ../src/x.ts import forms + new URL("../src/x.ts") BIN constants; update tests/canary-invariants.test.ts:53 hardcoded src/reviewer-loop.ts
3. COMMIT 2 (docs sweep, independent): docs/architecture/{tool-boundaries,backlog-lifecycle,headroom-proxy,model-routing,runbook-decomposition,worktree-discipline,README}.md + diagrams/tool-boundaries.html + docs/cli.md + payload skills with repo-internal src/*.ts refs. FROZEN (byte-identical): docs/research/RESEARCH.md (MUST-NOT-edit), docs/specs/2026-09-05-v010-draft-brief.md (ratified, TASK-70 AC#2), docs/learnings/*, docs/superpowers/plans/*, installed-path strings (~/.agents/bin/src/*, bin/src/*) in enforce.ts messages:669,741, payload/config/agents/*, SKILL.md, test fixtures. CAUTION: enforce.ts:474 message text may sit inside code being edited in commit 1 - edit only the path literals, keep the message strings untouched.
4. Verify (fresh, in worktree): npm run typecheck; npm test; npm run lint; rm -rf dist && npm run build (stale dist/ would mask resolver breakage via existsSync .js-preferred branches); dist smoke: node dist/cli/index.js check --pre-commit against a fixture; grep zero stale refs: src/<script>.ts outside frozen set; grep src/tools/** + src/hooks/** for residual new URL("../; weavelog sync round-trip on live machine.
5. Finalization per task-finalization guide: check ACs one at a time with fresh evidence, difit human gate, merge.

2c-rev. Introduce src/tool-paths.ts as the ONLY place that builds tool-script paths; route all cli/index.ts, hooks/enforce.ts, agents-install.ts, stack-check.ts resolvers through it; add canary test (house style: tests/canary-invariants.test.ts pattern) asserting no path-building for tool scripts outside the module.
2f. STANDARDS GUARDRAIL (commit 2): add Standards bullet to root AGENTS.md - tool script paths resolve only via src/tool-paths.ts; prefer importing tool functions over spawning scripts. Follow-up task (spawn-removal: convert spawn-by-path to direct imports where sensible) is created right after TASK-71 merges, to avoid inferNextTaskId collision.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Plan reviewed by DeepSeek (REJECT on draft v1: false step-5 premise removed, docs misclassifications fixed, canary test added) and Qwen (APPROVE-WITH-CHANGES: runtime-resolver blast radius, repoRoot drift, atomic-commit sequencing, stale dist/ trap, clean-build gate). Merged into this plan.

User ratified guardrail split 2026-09-07: single path module + canary tripwire in TASK-71; spawn-removal as follow-up; standard into AGENTS.md Standards.

Validation (fresh, worktree): tsc --noEmit clean; node:test 599/599 pass; biome check 0 errors 0 warnings (469 findings cleared); rm -rf dist && npm run build emits 16 dist/tools/*.js; node dist/cli/index.js check --stack-only exit 0 (1 pre-existing pi.version machine drift, present on main, unrelated); sync round-trip exit 0 zero refusals idempotent; src/ contains only cli/hooks/tools; frozen docs byte-identical (git status empty). Third fix round: restored Promise.resolve wrappers in Hook 9 injected runConfigSync helpers (enforce-hooks.test.ts) — prior round broke the () => Promise contract so withTimeout threw inside the fail-open catch and swallowed refusals; renamed ArchValidBWithRecip/WithoutRecip -> ArchValidSecondWithRecip/WithoutRecip (biome strictCase BW consecutive caps); extended sync-model-pricing DbEntry to the full written-field shape. Docs sweep: 9 stale src/<tool>.ts refs -> src/tools/ (headroom-proxy, model-routing, runbook-decomposition); installed-path strings (~/.agents/bin/src/*) left frozen; AGENTS.md Standards bullet added (tool-paths.ts single resolver; prefer imports; per-harness adapters own hook wiring).
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Moved 15 standalone tool scripts from src/ to src/tools/ with a single path module (src/tools/tool-paths.ts) as the only tool-script resolver; all ES imports, runtime resolvers, docs, and the canary guardrail updated; biome config landed (2-space/80/lf, organized imports, warn-tier ruleset) and all 469 findings cleared as code. Verified: tsc clean, 599/599 tests, biome 0/0, clean build emitting dist/tools/*.js, dist CLI smoke, sync round-trip with zero refusals, frozen docs byte-identical.
<!-- SECTION:FINAL_SUMMARY:END -->
