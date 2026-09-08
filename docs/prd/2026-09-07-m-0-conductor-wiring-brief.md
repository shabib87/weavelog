---
date: 2026-09-07
topic: "Conductor wiring"
status: backfilled
type: prd
author: conductor
related_to: []
sources:
  - "TASK-76"
milestones:
  - m-0
---

# Conductor wiring — milestone brief (m-0)

Wire the conductor pattern to backlog.md: lifecycle fields via CLI flags, stack checks, spec-driven verification (EARS ACs, verify-gate activation, reviewer prompt updates).

## Requirements

- R1. Conductor state lives in backlog.md fields, one concern per CLI flag; no sidecar plan files.
- R2. Spec review (HITL) gates To Do -> In Progress via the spec-approved label.
- R3. Acceptance criteria are EARS-style WHEN/THEN and are checked per-AC, only with fresh evidence.

## TRD linkage

docs/trd/backlog-lifecycle.md (conductor flow -> backlog fields); docs/trd/loop-factory.md (three-phase model).

## Provenance

Backfilled 2026-09-07 (TASK-76): this milestone was decided and executed in-thread before the brief convention existed. Decisions recorded in docs/research/2026-08-16-work-management-layer-selection.md and docs/research/2026-08-23-backlog-md-capability-audit.md. Ratification happened in-thread (human-approved); this brief is the record, not a new decision.

PRD anchor rule: `backlog/milestones/m-0 - *.md` points back here
(machine-checked bidirectionally; see ADR-0005).
