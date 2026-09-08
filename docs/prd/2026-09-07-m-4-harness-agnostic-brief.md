---
date: 2026-09-07
topic: "Harness agnostic"
status: backfilled
type: prd
author: conductor
related_to: []
sources:
  - "TASK-76"
milestones:
  - m-4
---

# Harness agnostic — milestone brief (m-4)

Make the harness opencode/pi-agnostic: SDK driver pipeline, agent sharing across hosts, config as portable payload.

## Requirements

- R1. Host-specific config is generated from repo payload sources; hosts never hand-edit live config.
- R2. The SDK driver pipeline works for both opencode and pi.
- R3. Agent/prompt definitions are shared, not forked per host.

## TRD linkage

docs/trd/loop-factory.md (host-agnostic roles); payload/ layout per payload/AGENTS.md.

## Provenance

Backfilled 2026-09-07 (TASK-76): decided in docs/research/2026-08-15-inner-harness-layers.md and docs/research/2026-08-15-inner-harness-vocabulary.md; executed in-thread. This brief is the record.

PRD anchor rule: `backlog/milestones/m-4 - *.md` points back here
(machine-checked bidirectionally; see ADR-0005).
