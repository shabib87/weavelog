---
id: TASK-72
title: >-
  Spawn-removal: convert spawn-by-path tool invocations to direct imports where
  sensible
status: To Do
assignee: []
created_date: '2026-09-07 15:34'
updated_date: '2026-09-07 15:55'
labels: []
dependencies: []
ordinal: 58500
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Today several modules invoke tool scripts by SPAWNING them as child processes with paths resolved through src/tools/tool-paths.ts: src/hooks/enforce.ts spawns config-sync.ts via configSyncArgv (node, withTimeout single-timeout-owner), src/tools/agents-install.ts phase-4 spawns .ts tool scripts with a tsx prefix, and src/tools/stack-check.ts spawns sync-model-pricing.ts --check for drift detection. Spawning costs a process per call, needs TSX loader plumbing, crosses an untyped string boundary, and is harder to test than an import. Outcome: convert spawn-by-path call sites to direct function imports wherever the contract allows, keeping a real spawn only where a process boundary is genuinely required (kill-based timeouts, isolation). After conversion, fewer tool-script path spawns remain, but tool-paths.ts stays the single resolver for anything still spawned or path-resolved. Behavior must not change.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 WHEN the conversion lands, THEN every call site that previously spawned a tool script either imports the tool's exported function directly or retains the spawn with an inline justification comment naming the required process-boundary property
- [ ] #2 IF a spawn is retained, THEN its path still resolves exclusively through src/tools/tool-paths.ts and its timeout/kill semantics are preserved (enforce.ts config-sync single-timeout-owner contract)
- [ ] #3 WHEN the full test suite runs, THEN behavior is unchanged: config-sync refusal/exit-code semantics, stack-check --check drift propagation, and agents-install phase-4 tool invocations behave identically
- [ ] #4 WHEN the guardrail test tests/tool-paths.test.ts runs, THEN the single-resolver invariant still holds for any remaining path-based tool-script lookup
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Tests and lint pass with fresh output in the worktree
- [ ] #2 Worktree is clean (no uncommitted changes)
- [ ] #3 Branch is rebased on main and green
- [ ] #4 All acceptance criteria checked with fresh evidence (one at a time, never batched)
<!-- DOD:END -->
