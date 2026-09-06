---
id: TASK-17
title: >-
  Update runbook Phase 7 + stack-check.ts for new stack-versions.json keys
  (piApp, diagramDesignCommit, diagramDesignRepo)
status: Done
assignee:
  - conductor
created_date: '2026-08-29 00:38'
updated_date: '2026-08-30 05:44'
labels:
  - v1
  - maintenance
milestone: m-0
dependencies: []
modified_files:
  - bin/src/stack-check.ts
  - bin/test/stack-check.test.ts
  - stack-versions.json
  - AGENT-STACK-RUNBOOK.md
priority: low
type: chore
ordinal: 700
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
stack-versions.json was updated (2026-08-28) with piApp, diagramDesignCommit, and diagramDesignRepo keys for the diagram-design skill installation. The runbook Phase 7 section still shows the old 2026-08-16 snapshot without these keys. stack-check.ts doesn't know about them either.

This is a small maintenance task to update the runbook and stack-check.ts to reflect the new manifest keys. Not related to the architecture docs — just keeping the stack documentation current.

Should be done in a worktree (task/task-17) per the v1 worktree discipline.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Runbook Phase 7 section updated to include piApp, diagramDesignCommit, and diagramDesignRepo keys in the stack-versions.json documentation
- [x] #2 stack-check.ts updated to check diagramDesignCommit against the installed skill's git commit (drift detection)
- [x] #3 stack-versions.json headroom pin updated from 0.35.0 to 0.36.5 (installed version)
- [x] #4 stack-versions.json opencodeApp pin updated from 1.18.18 to 1.18.25 (installed version)
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. stack-check.ts: add diagramDesignCommit + diagramDesignRepo + piApp to Manifest interface; add diagram-design drift check (resolve ~/.agents/skills/diagram-design symlink, git rev-parse HEAD, compare to pinned diagramDesignCommit; missing skill = drift) with STACK_CHECK_SKILLS_DIR env override for testability. 2. Add TDD test coverage for the diagramDesign check (happy: pinned==HEAD; unhappy: mismatch + missing skill). 3. Update runbook Phase 7 'verified content' JSON snapshot to mirror new stack-versions.json (headroom 0.36.5, opencodeApp 1.18.25, + piApp/diagramDesignCommit/diagramDesignRepo). 4. Bump stack-versions.json headroom 0.35.0->0.36.5 and opencodeApp 1.18.18->1.18.25 (both verified installed). 5. biome format/lint + bun test green.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented. stack-check.ts: added diagramDesignCommit/diagramDesignRepo/piApp to Manifest, exported checkDiagramDesign() (pure drift check: resolve skills/diagram-design, git rev-parse --short HEAD vs pinned; missing dir => missing-skill drift), wired into main() as check 4 with STACK_CHECK_SKILLS_DIR env override for tests; entrypoint now guarded by import.meta.main (matches reviewer-loop/headroom-compress pattern). stack-versions.json: headroom 0.35.0->0.36.5, opencodeApp 1.18.18->1.18.25 (both verified installed: headroom --version 0.36.5, CFBundleShortVersionString 1.18.25). Runbook Phase 7 snapshot mirrored to live manifest. TDD: 3 new failure-mode tests (match/mismatch/missing) red-first then green; bun test stack-check green (8/8).

Diff-review round 1 (qwen FLAG + glm APPROVE, both flagged coverage/determinism gaps). Fixed: (1) full-hash prefix compare (rev-parse HEAD, pinned short-sha as prefix) — removes core.abbrev auto-length ambiguity; (2) added negative test 'skill dir lacks git metadata'; (3) added integration test 'spawned run resolves skills via STACK_CHECK_SKILLS_DIR'. Re-verified: bun test stack-check -> 10/10; full bun test -> 192 pass / 1 fail (unrelated headroom-compress live-proxy 5s timeout, untouched by this task).

Diff-review round 2 (qwen FLAG + glm APPROVE + kimi APPROVE). All agree on empty-pin; fixed (fail-closed guard + test). kimi minor (missing-dir check shape) fixed (current:null). qwen major: runbook §6.2 (Phase 6) reproduces stack-check.ts 'verbatim' and is now inconsistent with the code/Phase 7 — but §6.2 was ALREADY stale pre-task (header still says 'superpowers tag'). Disposition decision pending human (fix §6.2 now vs defer to TASK-16 runbook split).

Round 2 disposition accepted: §6.2/6.3 'reproduced verbatim' claim removed — source under ~/.agents/bin/src/ is authoritative, listings are reference excerpts that may drift. Full §6.2 re-sync deferred to TASK-16 (runbook split).
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added diagram-design skill drift detection to stack-check.ts: exported checkDiagramDesign() (full rev-parse HEAD, pinned short-sha prefix compare; missing-dir / empty-pin / no-git / mismatch / match branches), wired as check #4 with STACK_CHECK_SKILLS_DIR override, entrypoint guarded by import.meta.main. Bumped stack-versions.json headroom 0.35.0->0.36.5 and opencodeApp 1.18.18->1.18.25 (verified installed). Updated runbook Phase 7 snapshot to mirror live manifest (+piApp/diagramDesignCommit/diagramDesignRepo) and dropped the stale 'verbatim' claim on 6.2/6.3. TDD: 6 new tests (red-first). Reviewed qwen+glm+kimi across 2 rounds; all findings resolved. Evidence: bun test 194 pass / 0 fail; E2E diagramDesign current=ac490fd pinned=ac490fd. Merged task/TASK-17 -> main.
<!-- SECTION:FINAL_SUMMARY:END -->
