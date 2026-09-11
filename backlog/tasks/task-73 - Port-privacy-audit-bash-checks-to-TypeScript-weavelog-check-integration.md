---
id: TASK-73
title: Port privacy-audit bash checks to TypeScript (weavelog check integration)
status: To Do
assignee: []
created_date: '2026-09-07 15:49'
updated_date: '2026-09-11 03:54'
labels: []
milestone: m-7
dependencies:
  - TASK-79
ordinal: 59500
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The privacy/sanitization checks (scan for absolute home-dir paths like /Users/, personal identifiers, and secret patterns before any commit) exist today as bash grep logic inherited from the legacy harness plus a MANUAL pre-commit ritual documented in AGENTS.md MUST-NOT; AGENTS.md says weavelog check will automate this when available. Bash-for-logic violates the repo standard (TypeScript is the only implementation language), manual scans get skipped under pressure, and the gate must be deterministic and testable. Outcome: during spec, inventory every bash check; reimplement them as a TypeScript module under src/tools/ (TASK-71 layout, tool-paths.ts conventions for any path resolution); wire the result into weavelog check as a subcheck with refusal semantics consistent with existing subchecks; delete the bash originals; update AGENTS.md so the pre-commit instruction points at the automated subcheck instead of the manual grep ritual.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 WHEN the privacy checks are inventoried THEN each legacy check is reimplemented in TypeScript or explicitly dropped with a recorded reason
- [ ] #2 WHEN weavelog check runs THEN it performs deterministic privacy, workspace test, lint, typecheck, and security verification subchecks
- [ ] #3 WHEN a scanned file set or workspace verification fails THEN the subcheck fails and names the file, failed command, or matched pattern
- [ ] #4 WHEN the port lands THEN no bash remains as implementation logic and AGENTS.md points at the automated checks
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
2026-09-10 correction: assigned to m-7 because deterministic privacy verification is a required v0.1 release gate.

2026-09-10 correction: TASK-73 is the narrowly scoped workspace-verification wiring task. It owns deterministic integration, not an unrestricted orchestration framework.
<!-- SECTION:NOTES:END -->
