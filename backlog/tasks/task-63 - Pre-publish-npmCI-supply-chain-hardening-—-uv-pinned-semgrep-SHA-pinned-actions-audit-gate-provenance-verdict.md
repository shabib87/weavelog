---
id: TASK-63
title: >-
  Pre-publish: npm+CI supply-chain hardening — uv-pinned semgrep, SHA-pinned
  actions, audit gate, provenance verdict
status: To Do
assignee: []
created_date: '2026-09-06 20:06'
updated_date: '2026-09-06 20:36'
labels:
  - harness
milestone: m-7
dependencies:
  - TASK-59
priority: high
ordinal: 51000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Harden weavelog own build and publish supply chain in .github/workflows/ci.yml and package.json per the ratified standard: semgrep installed via uv at an exact pinned version (replacing the floating pipx install semgrep), third-party actions pinned to full commit SHAs, least-privilege workflow permissions with persist-credentials false, a packageManager field with corepack-aligned npm ci, a standing npm audit gate failing on untriaged high and critical production advisories, and a numbered ADR recording the npm publish provenance adopt-or-skip verdict for the v0.1.0 path (verified registry state: weavelog@0.0.0 placeholder live, flightlead unpublished). Coordinate with TASK-45 Step 4 which owns the release-please workflow and may touch package.json publishConfig — rebase, different hunks. Boundary: manifest tracking of rtk, semgrep and node is deferred ticket A scope; this ticket pins only the CI install. Evidence: research note cli-bundling-vs-composition 2026-09-06.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 WHEN the CI semgrep step runs THEN semgrep SHALL install via uv at an exact pinned version with metrics off, pinned rulesets and error mode, and zero pipx references SHALL remain under .github/workflows/
- [ ] #2 WHEN any touched workflow is inspected THEN every third-party action SHALL be pinned to a full commit SHA with a version comment, the workflow SHALL declare least-privilege permissions, and checkout SHALL set persist-credentials to false
- [ ] #3 WHEN package.json is inspected THEN a packageManager field SHALL pin the exact npm that produced the committed lockfile, CI SHALL run npm ci under it via corepack, and the current one-line lockfile bin drift SHALL be reconciled in the same change
- [ ] #4 WHEN CI runs on main and pull requests and on a weekly schedule THEN a standing audit gate SHALL fail on untriaged high and critical production-dependency advisories, with every exception recorded in a committed triage entry with rationale and expiry
- [ ] #5 WHEN this ticket closes THEN a numbered ADR SHALL record the npm provenance adopt-or-skip verdict for the v0.1.0 path with rationale citing verified registry state
- [ ] #6 WHEN a tag or publish is attempted THEN this ticket SHALL be closed alongside TASK-53, TASK-54, TASK-56, TASK-62, TASK-64, TASK-66 and TASK-67 before the .github/publish-gate marker flips
- [ ] #7 WHEN npm pack runs THEN the tarball SHALL contain a fresh build (prepack wired to run build+test, replacing the prepublishOnly-only arrangement per the 2026-09-06 cross-thread reconciliation; TASK-45 Step 1.11b named prepublishOnly — the deviation is recorded in its pointer note) with tar -tzf verification covering dist/, payload/ and zero backlog/
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
