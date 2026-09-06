---
id: TASK-66
title: >-
  Pre-publish: clean-machine doctor+check semantics — degrade-to-warn for absent
  tools, output-shape test, README quickstart fix
status: To Do
assignee: []
created_date: '2026-09-06 20:33'
updated_date: '2026-09-06 20:34'
labels:
  - harness
milestone: m-7
dependencies:
  - TASK-59
priority: high
type: bug
ordinal: 54000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Clean-machine semantics for the weavelog CLI verification surface. Today `doctor` hard-fails when `~/.bun/bin/backlog` is absent (src/cli/index.ts ~490-494 -> exit 1 at ~860-871) and the `check` stack battery hard-fails when any optional host tool (headroom, backlog, markitdown, opencode, pi, diagram-design) is missing (~299-344) — while the README quickstart installs only `npm i -g weavelog`. So neither command can pass on a clean machine, which makes TASK-45 AC#6 (init/sync/update/check/doctor/scaffold each exit 0 on a clean arm64 fixture) unsatisfiable and the stranger test (TASK-67) un-runnable. Fix: degrade absent-tool subchecks to warn-when-absent (mirroring the existing proxy.health pattern, src/cli/index.ts ~472-475), reuse the PATH-resolving `resolveBacklogBin()` (~877-891) instead of the hardcoded ~/.bun/bin/backlog default, unify the two divergent default sites (~294 and ~491) and the doctor help wording, pin the doctor output SHAPE in a test via the WEAVELOG_BACKLOG_BIN seam + scrubbed PATH (not volatile strings — TASK-62 channel edits would break string pins), and correct the README quickstart (step 2 claims installs that do not happen; step 3 all-green is unreachable clean). ORDERING: this ticket SHALL land before TASK-62 and TASK-64 close — their ACs take doctor-exit-0 evidence that must be fresh. Evidence: 3-reviewer plan-gate consensus 2026-09-06 (doctor+check scope widening ruling: human chose BOTH).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 WHEN doctor runs on a machine without backlog THEN backlog.binary SHALL report warn (not fail), resolution SHALL use the PATH-walking helper instead of the hardcoded ~/.bun/bin/backlog default, and doctor SHALL exit 0
- [ ] #2 WHEN check runs on a clean fixture THEN every optional-tool subcheck (headroom, backlog, markitdown, opencode, pi, diagram-design) SHALL degrade to warn-when-absent mirroring the doctor fix, and check SHALL exit 0 when only optional tools are absent
- [ ] #3 WHEN the fix lands THEN a test SHALL pin the doctor output shape (subcheck ids, warn/skip markers, exit code) via the WEAVELOG_BACKLOG_BIN seam and a scrubbed PATH, without asserting volatile detail strings
- [ ] #4 WHEN the fix lands THEN both ~/.bun/bin/backlog default sites under src/cli/index.ts SHALL route through the shared PATH-resolving helper and the doctor help text SHALL use one unified backlog-resolution wording
- [ ] #5 WHEN the README quickstart is inspected THEN it SHALL match reality (deps step corrected; clean-machine doctor expectation = exit 0 with enumerated warn/skip lines), so TASK-67 can follow it verbatim
- [ ] #6 WHEN this ticket closes THEN it SHALL be closed alongside TASK-53, TASK-54, TASK-56, TASK-62, TASK-63, TASK-64 and TASK-67 before the publish-gate marker flips, AND it SHALL have landed before TASK-62 and TASK-64 close so their doctor-green evidence is fresh
- [ ] #7 WHEN the ticket completes THEN npm test, tsc and biome SHALL exit 0 with zero absolute /Users/ paths in committed files
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Tests and lint pass with fresh output in the worktree
- [ ] #2 Worktree is clean (no uncommitted changes)
- [ ] #3 Branch is rebased on main and green
- [ ] #4 All acceptance criteria checked with fresh evidence (one at a time, never batched)
- [ ] #5 Doctor re-run on the real machine demonstrates the warn path (backlog absent is impossible to simulate locally; seam-based test covers it)
<!-- DOD:END -->
