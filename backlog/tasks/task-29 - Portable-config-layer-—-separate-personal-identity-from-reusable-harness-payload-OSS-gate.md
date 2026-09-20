---
id: TASK-29
title: >-
  Portable config layer — separate personal identity from reusable harness
  payload (OSS gate)
status: Done
assignee:
  - '@conductor'
created_date: '2026-08-31 03:59'
updated_date: '2026-09-20 06:50'
labels:
  - harness
  - spec-approved
milestone: m-4
dependencies:
  - TASK-28
  - TASK-79
priority: high
ordinal: 21000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Outcome: implement the global materialization contract in docs/trd/cli-vision.md and ADR-0008. Weavelog is an opinionated, greenfield-first harness: fan shared skills to ~/.agents and verified OpenCode configuration to its native root. Render user choices from profiles without packaging personal defaults or secret values. Why: global setup must be portable, auditable, and recoverable without merging or silently adopting an existing setup.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 WHEN a fresh user runs init THEN declared global targets are rendered from the strict JSON harness manifest, the full JSONC OpenCode template, and user profile choices without secret values or personal defaults.
- [x] #2 WHEN the package is built THEN path segments secrets, backlog, state, reports, logs, .worktrees, and node_modules plus every docs/research subtree are excluded; the harness manifest remains control metadata and is never copied live.
- [x] #3 WHEN default preflight finds an unowned, changed, ambiguous, or state-missing declared target THEN init or update logs refusal, exits nonzero, and writes no declared target.
- [x] #4 WHEN the user requests --force for eligible declared leaf files THEN the CLI shows the exact replacement and requires TTY confirmation or --force --yes; it stages new content, preserves an opaque .bak under ~/.local/state/weavelog/backups/<run-id>/, journals the operation, and rolls back only when safe.
- [x] #5 WHEN profile inputs or derived state are stored THEN profiles contain only choices and secret references, snapshots exclude secret values, and target state uses opaque IDs with active-profile and immutable render snapshots.
- [x] #6 WHEN sync or init runs THEN the run report records the resolved installed package root and bin path, and the command refuses with a nonzero exit when the installed payload is older than the repo payload or another weavelog install shadows the resolved bin on PATH, so a stale or shadowed install never materializes silently
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Extract a shared declared-targets module from config-sync.ts (manifest read, normalize, exclusions, lstat symlink safety) so init, update, and sync implement one contract — reuse, no duplication.
2. TDD: package-root resolver + PATH shadow detector (AC #6) — report records resolved installed package root + bin path; refuses nonzero when another weavelog install shadows the resolved bin, and when sync runs with installed payload older than repo payload (author machine). Synthetic PATH fixtures in tests.
3. TDD: ownership receipts + render snapshots under ~/.local/state/weavelog/materialize/<harness>/<target-id>/ — opaque target-id digests, active-profile pointer, immutable snapshots, dirs 0700 / backups 0600, lstat-only, no raw home paths in state.
4. TDD: profile layer ~/.config/weavelog/profiles/<id>.json — choices + secret refs only, never values; precedence CLI flags > confirmed answers > profile > package-safe defaults; feeds the existing {{TOKEN}} render.
5. TDD: rebuild init per the ownership/replacement table (cli-vision.md) — whole-run preflight, all-or-nothing refusal, stage + journal intent before write, opaque .bak under backups/<run-id>/, install, journal completion, rollback only on safe failure, recovery refusal when target changed after interrupted run.
6. Add update command on the same contract; run journal ledger.jsonl (never contents or secrets). sync stays the tested dogfood path unchanged in behavior.
7. AC #2: build-time package-exclusion check (test asserts packed tarball has no secrets/, backlog/, docs/research/, state/, reports/, logs/, .worktrees/, node_modules/ at any depth).
8. Verify: node --test full suite, biome check, tsc --noEmit; update docs/cli.md init/update rows to delivered behavior; diff review, then merge gate.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
install-guard 4/4 + post-rebase live proof: report records resolvedPackageRoot/resolvedBinPath; refuses shadowed PATH install and stale installed payload; guard demonstrated refusing the real nvm shadow during the rebase integration

final summary recorded; all 6 ACs checked with fresh evidence (see per-AC notes)
<!-- SECTION:NOTES:END -->
