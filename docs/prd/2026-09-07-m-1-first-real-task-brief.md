---
date: 2026-09-07
topic: "First real task"
status: backfilled
type: prd
author: conductor
related_to: []
sources:
  - "TASK-76"
milestones:
  - m-1
---

# First real task — milestone brief (m-1)

Ship one real task end-to-end through the full flow (spec -> implement -> verify -> merge) plus proxy-routing dogfood.

## Requirements

- R1. One task traverses the entire three-phase loop with both human gates exercised.
- R2. Headroom proxy routing is exercised and measured during the dogfood run.
- R3. Failure of any gate blocks the merge; no gate bypass.

## TRD linkage

docs/trd/loop-factory.md; docs/trd/headroom-proxy.md.

## Provenance

Backfilled 2026-09-07 (TASK-76): decided and executed in-thread pre-brief-convention. See docs/research/2026-08-15-loop-primitives-claude-codex-sdk.md and docs/research/2026-08-15-headroom-sdk-utilization.md. This brief is the record of the in-thread ratification.

PRD anchor rule: `backlog/milestones/m-1 - *.md` points back here
(machine-checked bidirectionally; see ADR-0005).
