---
id: TASK-63
title: >-
  Pre-publish: npm+CI supply-chain hardening — uv-pinned semgrep, SHA-pinned
  actions, audit gate, provenance verdict
status: To Do
assignee: []
created_date: '2026-09-06 20:06'
updated_date: '2026-09-11 04:33'
labels:
  - harness
milestone: m-7
dependencies:
  - TASK-59
  - TASK-79
priority: high
ordinal: 51000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Outcome: harden Weavelog build, publish, and supply-chain machinery in package metadata and `.github/workflows/`. Why: v0.1 needs reproducible package evidence and a human-controlled publication path. Pin semgrep through uv, third-party actions to full commit SHAs, least-privilege permissions and checkout without persisted credentials; pin the package manager and reproducible install; fail npm audit on untriaged high or critical production advisories; build before pack; and record a numbered ADR for the npm provenance adopt-or-skip decision. TASK-63 owns release-please or equivalent publication-workflow wiring, which may only publish after TASK-67 evidence and an explicit human marker decision. It does not own external tool installation or TASK-83 public-history clearance.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 WHEN the CI semgrep step runs THEN semgrep installs through the documented pinned channel with metrics off, pinned rulesets, error mode, and no pipx references under workflows
- [ ] #2 WHEN a touched workflow is inspected THEN every third-party action is pinned to a full commit SHA with a version comment, least-privilege permissions, and checkout without persisted credentials
- [ ] #3 WHEN package metadata is inspected THEN it pins the package manager that produced the lockfile and CI runs the reproducible install command
- [ ] #4 WHEN CI runs on main, pull requests, and its scheduled cadence THEN the audit gate fails on untriaged high or critical production advisories with committed rationale and expiry for every exception
- [ ] #5 WHEN this task closes THEN a numbered ADR records the npm provenance adopt-or-skip verdict for v0.1.0 with verified registry evidence
- [ ] #6 WHEN a tag or npm publish is attempted THEN TASK-53, TASK-54, TASK-55, TASK-62, TASK-63, TASK-64, TASK-66, TASK-67, TASK-68, TASK-73, and TASK-84 are closed; TASK-56 cleanup is not a publication blocker
- [ ] #7 WHEN npm pack runs THEN the exact tarball contains a fresh build, dist, payload, and zero backlog files
- [ ] #8 WHEN the publication workflow is implemented THEN release-please or its approved equivalent prepares the release but cannot publish unless TASK-67 evidence is accepted and the human-controlled publish marker is set
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Tests and lint pass with fresh output in the worktree
- [ ] #2 Worktree is clean (no uncommitted changes)
- [ ] #3 Branch is rebased on main and green
- [ ] #4 All acceptance criteria checked with fresh evidence (one at a time, never batched)
<!-- DOD:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-09-06 cross-thread reconciliation: closure-set AC now explicit IDs; prepack AC added (pack freshness gap found by the stranger-test 3-reviewer passes). Coordinate hunks with TASK-67 CI battery job (same workflow files; 67 rebases on this rewrite).
<!-- SECTION:NOTES:END -->
