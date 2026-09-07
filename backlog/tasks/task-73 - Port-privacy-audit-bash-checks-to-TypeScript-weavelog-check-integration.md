---
id: TASK-73
title: Port privacy-audit bash checks to TypeScript (weavelog check integration)
status: To Do
assignee: []
created_date: '2026-09-07 15:49'
updated_date: '2026-09-07 15:55'
labels: []
dependencies: []
ordinal: 59500
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The privacy/sanitization checks (scan for absolute home-dir paths like /Users/, personal identifiers, and secret patterns before any commit) exist today as bash grep logic inherited from the legacy harness plus a MANUAL pre-commit ritual documented in AGENTS.md MUST-NOT; AGENTS.md says weavelog check will automate this when available. Bash-for-logic violates the repo standard (TypeScript is the only implementation language), manual scans get skipped under pressure, and the gate must be deterministic and testable. Outcome: during spec, inventory every bash check; reimplement them as a TypeScript module under src/tools/ (TASK-71 layout, tool-paths.ts conventions for any path resolution); wire the result into weavelog check as a subcheck with refusal semantics consistent with existing subchecks; delete the bash originals; update AGENTS.md so the pre-commit instruction points at the automated subcheck instead of the manual grep ritual.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 IF the bash originals are inventoried during spec, THEN every check they perform is either reimplemented in TypeScript or explicitly dropped with a recorded reason in the task
- [ ] #2 WHEN weavelog check runs, THEN a privacy subcheck executes the sanitization scan (absolute home-dir paths, personal identifiers, secret patterns) with pass/fail semantics consistent with existing subchecks
- [ ] #3 WHEN a scanned file set contains a violation, THEN the subcheck fails and its message names the file and the matched pattern
- [ ] #4 WHEN the port lands, THEN no bash remains as implementation logic and AGENTS.md's pre-commit sanitization instruction points to the automated subcheck
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Tests and lint pass with fresh output in the worktree
- [ ] #2 Worktree is clean (no uncommitted changes)
- [ ] #3 Branch is rebased on main and green
- [ ] #4 All acceptance criteria checked with fresh evidence (one at a time, never batched)
<!-- DOD:END -->
