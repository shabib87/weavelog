---
id: TASK-56
title: 'Pre-publish: repo cleanup — stale loopeng-era docs disposition pass'
status: To Do
assignee: []
created_date: '2026-09-06 07:08'
updated_date: '2026-09-06 21:54'
labels:
  - harness
milestone: m-7
dependencies:
  - TASK-58
  - TASK-59
priority: high
ordinal: 44000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Outcome: ~/Projects/flightlead docs/ and root carry zero stale loopeng-era artifacts; every non-spine file has exactly one recorded disposition (keep / move to docs/archive/ / delete) ratified by the human BEFORE any deletion; post-cleanup the repo reads as a coherent v0.1.0 OSS project. Why: the port preserved the loopeng working tree wholesale (TASK-45 Stream A + 1.6); the repo still carries session-era material that does not belong in a public v0.1.0 (old session logs, superseded designs, personal-era learnings). Human flagged this at the 3.3 checkpoint (2026-09-06). Inventory (54 stale-candidate files + 3 root docs): docs/INDEX.md 167L, docs/NEXT_SESSION.md 76L, docs/PROGRESS.md 634L; docs/adr x2 (0001 loopeng-architecture-decisions, 0002 bash-homebrew-tooling); docs/archive x7; docs/learnings x15; docs/pi-workspace x1; docs/research x15 (10 x 2026-07-* notes + RESEARCH.md + loop-taxonomy.md + model-selection.md + the 2 ported 2026-09-02 public-safe notes); docs/specs x3 (2026-06-28-loopeng-design, 2026-09-05-v010-draft-brief, 2026-09-05-github-repo-metadata); docs/superpowers x5 (plans+specs); docs/tbd x6; root CLAUDE.md; root AGENTS.md (loopeng-era constitution with stale tree diagram — superseded by payload/AGENTS.md semantics). PROVENANCE CAVEAT: the brief and github-repo-metadata specs are ACTIVE ratification records (TASK-45 references live there) — do not delete without a fate that preserves them. Also: PRODUCT.md cites docs/research notes (2026-09-02-oss-agent-harnesses at lines 151/277/295) and ATTRIBUTION.md cites it too — dispositions must not create dangling citations (TASK-45 0.1(2) kept them on the promise the note ships). Scope EXCLUDES: ~/.agents personal docs (AC#5 terminal state, ratified), docs/architecture (fresh), docs/cli.md, spine (NORTH_STAR/PRODUCT/ROADMAP/README), payload/, src/, tests/.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 WHEN the disposition pass runs THEN every file in the inventory (docs/INDEX, NEXT_SESSION, PROGRESS, adr x2, archive x7, learnings x15, pi-workspace x1, research x15, specs x3, superpowers x5, tbd x6, root CLAUDE.md, root AGENTS.md) SHALL have exactly one human-ratified disposition (keep / archive to docs/archive/ / delete) recorded in a committed disposition map BEFORE any deletion
- [ ] #2 IF any deletion or move would create a dangling reference THEN the referencing file SHALL be updated in the same commit (grep for the moved/deleted paths returns zero hits post-cleanup, excluding git history)
- [ ] #3 WHEN the cleanup completes THEN ./scripts/privacy-audit SHALL exit 0 and the docs spine (README, NORTH_STAR, PRODUCT, ROADMAP) SHALL carry no references to deleted paths
- [ ] #4 WHEN a tag or publish is attempted THEN this ticket SHALL be closed alongside TASK-53, TASK-54, TASK-62, TASK-63, TASK-64, TASK-66 and TASK-67 before the .github/publish-gate marker flips
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Tests and lint pass with fresh output in the worktree
- [ ] #2 Worktree is clean (no uncommitted changes)
- [ ] #3 Branch is rebased on main and green
- [ ] #4 All acceptance criteria checked with fresh evidence (one at a time, never batched)
- [ ] #5 docs/architecture/config-sync-flow diagram produced (TASK-35 absorbed; scope carve-out to the fresh-docs exclusion)
<!-- DOD:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-09-06: harness label added per the TASK-51 decision table (task dispositions root AGENTS.md -> first match: harness). FLAGGED for this task's thread: backlog/config.yml project_name is 'agents-harness' (copied verbatim per the TASK-45 1.6 amendment); it makes harness-dev-context detection treat flightlead as agents-harness. Decide in-thread whether to correct it to 'flightlead' (deviation from the travels-unchanged amendment) or leave it.

2026-09-06 dangling-task sweep (human-approved): absorbs TASK-35 — the config-sync-flow architecture diagram is produced as part of this cleanup pass so m-3 closes clean. Scope carve-out to the docs/architecture exclusion (diagram only, no other fresh-doc changes).
<!-- SECTION:NOTES:END -->
