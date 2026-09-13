---
id: TASK-29
title: >-
  Portable config layer — separate personal identity from reusable harness
  payload (OSS gate)
status: To Do
assignee: []
created_date: '2026-08-31 03:59'
updated_date: '2026-09-12 20:15'
labels: []
milestone: m-4
dependencies:
  - TASK-28
  - TASK-79
ordinal: 21000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Outcome: implement the global materialization contract in docs/trd/cli-vision.md and ADR-0008. Weavelog is an opinionated, greenfield-first harness: fan shared skills to ~/.agents and verified OpenCode configuration to its native root. Render user choices from profiles without packaging personal defaults or secret values. Why: global setup must be portable, auditable, and recoverable without merging or silently adopting an existing setup.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 WHEN a fresh user runs init THEN declared global targets are rendered from the strict JSON harness manifest, the full JSONC OpenCode template, and user profile choices without secret values or personal defaults.
- [ ] #2 WHEN the package is built THEN path segments secrets, backlog, state, reports, logs, .worktrees, and node_modules plus every docs/research subtree are excluded; the harness manifest remains control metadata and is never copied live.
- [ ] #3 WHEN default preflight finds an unowned, changed, ambiguous, or state-missing declared target THEN init or update logs refusal, exits nonzero, and writes no declared target.
- [ ] #4 WHEN the user requests --force for eligible declared leaf files THEN the CLI shows the exact replacement and requires TTY confirmation or --force --yes; it stages new content, preserves an opaque .bak under ~/.local/state/weavelog/backups/<run-id>/, journals the operation, and rolls back only when safe.
- [ ] #5 WHEN profile inputs or derived state are stored THEN profiles contain only choices and secret references, snapshots exclude secret values, and target state uses opaque IDs with active-profile and immutable render snapshots.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Deferral recorded from TASK-23 session 2026-08-30 (deepseek NEEDS-RESCOPE finding 1 + kimi finding 3, resolved as post-v1).

2026-09-10 correction: moved m-5 -> m-4. Portable configuration is host-portability foundation; m-7 release checklist retains the v0.1 subset as a blocker.

2026-09-12 scope alignment: the earlier post-v1 deferral note is superseded for the v0.1.0 global materialization slice defined in the current description and acceptance criteria. ADR-0008 and docs/trd/cli-vision.md are the contract. `--force` is allowed only as confirmed, backed-up whole-file replacement.
<!-- SECTION:NOTES:END -->
