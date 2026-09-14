---
id: TASK-66
title: Supported-profile doctor and check semantics
status: To Do
assignee: []
created_date: '2026-09-06 20:33'
updated_date: '2026-09-13 16:46'
labels:
  - harness
milestone: m-7
dependencies:
  - TASK-59
  - TASK-79
  - TASK-29
priority: high
type: bug
ordinal: 54000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Outcome: make doctor and check report supported-profile readiness honestly. Before initialization, missing setup tools may warn; after initialization, required profile components fail loudly. Add active OpenCode-source conflict detection from docs/trd/cli-vision.md: init/update refuse unsupported global profiles before writes, while doctor/check report unsupported state. Why: destination-path checks alone cannot detect competing active OpenCode configuration.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 WHEN doctor runs before initialization without Backlog THEN it reports setup incomplete as a warning, uses the PATH-walking helper, and exits 0
- [ ] #2 WHEN doctor or check runs on the supported profile after init THEN missing OpenCode, Headroom, Backlog, or a required gate fails the profile; only documented optional tools warn when absent
- [ ] #3 WHEN the fix lands THEN tests pin the doctor output shape through the Backlog seam and a scrubbed PATH
- [ ] #4 WHEN the README quickstart is inspected THEN it distinguishes pre-init setup warnings from post-init required-tool failures
- [ ] #5 WHEN this task closes THEN dependent portability tasks rerun their doctor evidence after it lands
- [ ] #6 WHEN doctor or check evaluates the OpenCode profile THEN it detects conflicting active OpenCode configuration sources, reports the profile as unsupported, and does not claim successful readiness; init/update refuse the unsupported profile before writing, and --force does not bypass this check.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Tests and lint pass with fresh output in the worktree
- [ ] #2 Worktree is clean (no uncommitted changes)
- [ ] #3 Branch is rebased on main and green
- [ ] #4 All acceptance criteria checked with fresh evidence (one at a time, never batched)
- [ ] #5 Doctor re-run on the real machine demonstrates the warn path (backlog absent is impossible to simulate locally; seam-based test covers it)
<!-- DOD:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-09-10 correction: OpenCode, Headroom, Backlog, required gates, and audit output are core supported-profile requirements. Pre-init warnings do not mean those tools are optional after init.

2026-09-12 scope alignment: active OpenCode-source conflict detection is included in this supported-profile check and depends on TASK-29 materialization behavior; `--force` cannot bypass an unsupported profile.

2026-09-13 fresh audit evidence, no fixes applied: full suite outside sandbox exits 1 with three leaf failures in tests/cli/index.test.ts:417,460,478. The doctor success fixtures never install the OpenCode adapters required since commit b9751c8; initialize those fixtures and preserve missing-adapter negative coverage. Their fake Headroom binary also causes a real fixed localhost:8788 health request; isolate that boundary. The stack-only failure is a product regression: src/cli/index.ts:404 defaults to docs/architecture/worktree-discipline.md, which no longer exists. A focused rerun with WEAVELOG_DIFIT_DOC set to the existing docs/trd file passes (one test, exit 0). Correct the default path here. These are bounded repairs within supported-profile doctor/check work, not grounds for a redesign.
<!-- SECTION:NOTES:END -->
