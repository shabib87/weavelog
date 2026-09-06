---
id: TASK-55
title: 'Post-flip: re-activate enforcement hooks from the flightlead package'
status: To Do
assignee: []
created_date: '2026-09-06 06:26'
updated_date: '2026-09-06 21:54'
labels: []
milestone: m-7
dependencies:
  - TASK-58
  - TASK-59
priority: high
ordinal: 43000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Outcome: the author machine's opencode enforcement hooks (enforce.ts, verify-gate.ts) load from the ported flightlead src/hooks/ machinery instead of the stale ~/.config/opencode/plugins/ copies that reference the deleted ~/.agents/bin tree (they currently fail open, so live enforcement is degraded post-flip). Why: TASK-45's port made the hooks package-relative (they resolve ../task-validate.js etc. relative to the hook file), so copying them to ~/.config/opencode/plugins/ cannot work unchanged; opencode only auto-loads plugins from that dir. Design needed: a thin plugin loader in ~/.config/opencode/plugins/ that imports the installed/pinned flightlead package hooks (or an equivalent mechanism), verified by a gate actually firing. Follow-up to TASK-45 PORT PLAN v8 (flagged during the 3.3 flip).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 WHEN a fresh opencode session starts THEN at least one enforcement gate from the flightlead package SHALL load and fire (verified by an intentional gate trip), replacing the fail-open stale plugins
- [ ] #2 IF the flightlead package cannot be resolved from the plugins dir THEN the loader SHALL fail open with a logged reason (zero silent failure)
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Tests and lint pass with fresh output in the worktree
- [ ] #2 Worktree is clean (no uncommitted changes)
- [ ] #3 Branch is rebased on main and green
- [ ] #4 All acceptance criteria checked with fresh evidence (one at a time, never batched)
<!-- DOD:END -->
