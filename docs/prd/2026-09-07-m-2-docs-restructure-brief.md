---
date: 2026-09-07
topic: "Docs restructure"
status: backfilled
type: prd
author: conductor
related_to: []
sources:
  - "TASK-76"
milestones:
  - m-2
---

# Docs restructure — milestone brief (m-2)

Create the architecture docs corpus, split the runbook, and fix stale references so every fact has one authoritative home.

## Requirements

- R1. docs/architecture (now docs/trd) holds loop model, tool boundaries, backlog lifecycle, test guardrails.
- R2. The runbook splits; architecture sections move out and cross-references update.
- R3. No stale references remain after the pass.

## TRD linkage

docs/trd/README.md (TRD corpus index); docs/trd/runbook-decomposition.md.

## Provenance

Backfilled 2026-09-07 (TASK-76): executed as TASK-15/TASK-16 with in-thread ratification. Note: superseded in part by the 2026-09-07 ADR-0005 physical reorg (docs/architecture -> docs/trd + docs/adr + docs/prd).

PRD anchor rule: `backlog/milestones/m-2 - *.md` points back here
(machine-checked bidirectionally; see ADR-0005).
