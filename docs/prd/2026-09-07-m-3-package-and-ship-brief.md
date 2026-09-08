---
date: 2026-09-07
topic: "Package and ship"
status: backfilled
type: prd
author: conductor
related_to: []
sources:
  - "TASK-76"
milestones:
  - m-3
---

# Package and ship — milestone brief (m-3)

Move the harness to ~/Projects, private GitHub repo, semver, and the setup guide (opencode+pi+headroom+diagram-design+backlogmd+difit+ghostty).

## Requirements

- R1. The harness installs from a private repo and reproduces the working stack on a second machine.
- R2. Versions are pinned via the stack manifest (weavelog.json / stack-versions).
- R3. The setup guide covers every stack component listed in the milestone scope.

## TRD linkage

docs/trd/worktree-discipline.md; docs/trd/runbook-decomposition.md.

## Provenance

Backfilled 2026-09-07 (TASK-76): decided in docs/research/ (migration planning, TASK-34/45) and executed in-thread. This brief is the record of that in-thread ratification.

PRD anchor rule: `backlog/milestones/m-3 - *.md` points back here
(machine-checked bidirectionally; see ADR-0005).
