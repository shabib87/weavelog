---
id: TASK-78
title: >-
  Deterministic L1 risk-signal detector in weavelog check — protected-path glob
  + run-ledger retry counts on merged diff vs base
status: In Progress
assignee:
  - '@conductor'
created_date: '2026-09-07 23:04'
updated_date: '2026-09-07 23:07'
labels:
  - spec-approved
dependencies:
  - TASK-77
ordinal: 62500
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implements the machine-computed L1 escalation triggers that ADR-004 names a Phase-2 acceptance test and TASK-75 recorded as conductor-manual at 0.1.0. Reference: docs/architecture/adr/0004-model-selection-benchmark-policy.md (trigger determinism section). Outcome: weavelog check gains a deterministic detector that (a) matches protected-path globs on auth/crypto/secrets/data-persistence/permission paths and (b) reads retry-failure counts from the run ledger, both computed on the MERGED DIFF AGAINST BASE (never line count, never self-report, never LLM judgment). The detector's output feeds the L0-to-L1 reviewer escalation recorded per run with a reason code. Out of scope per ADR-004 (explicitly post-0.1.0): cyclomatic-complexity deltas and cross-module-coupling deltas — they need AST analysis beyond the 0.1.0 gate set. Files: src/cli/index.ts (check command), a new src/tools/ detector module, tests/. WHY: reviewer.md/plan-reviewer.md carry trigger semantics that only the conductor evaluates by hand; this closes the gap so escalation is machine-checked.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 WHEN weavelog check runs on a working tree THEN the detector SHALL compute risk signals on the merged diff against the merge base and report protected-path touches (auth/crypto/secrets/data-persistence/permission globs) with file:line evidence
- [ ] #2 IF the run ledger records retry failures for the current task THEN the detector SHALL surface the count and feed the L0-to-L1 escalation decision with a reason code
- [ ] #3 IF the detector cannot determine the merge base or the ledger is absent THEN it SHALL fail closed with an explicit skip reason, never a silent pass
- [ ] #4 WHEN a risk signal fires THEN the run record SHALL log level, trigger, and reason code so the ladder can be tuned against TASK-47 telemetry
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Tests and lint pass with fresh output in the worktree
- [ ] #2 Worktree is clean (no uncommitted changes)
- [ ] #3 Branch is rebased on main and green
- [ ] #4 All acceptance criteria checked with fresh evidence (one at a time, never batched)
<!-- DOD:END -->
