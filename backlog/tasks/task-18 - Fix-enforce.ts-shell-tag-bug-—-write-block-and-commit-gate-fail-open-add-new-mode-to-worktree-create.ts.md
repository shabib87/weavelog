---
id: TASK-18
title: >-
  Fix enforce.ts $ shell-tag bug — write-block and commit gate fail open + add
  --new mode to worktree-create.ts
status: Done
assignee:
  - conductor
created_date: '2026-08-29 02:24'
updated_date: '2026-08-29 02:42'
labels:
  - enforce
  - bugfix
  - worktree
dependencies: []
documentation:
  - ~/.config/opencode/plugins/enforce.ts
  - ~/.agents/bin/test/enforce-hooks.test.ts
  - ~/.agents/bin/src/worktree-create.ts
  - ~/.agents/docs/plans/2026-08-16-enforce-hooks-recovery.md
priority: high
type: bug
ordinal: 11000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The enforce.ts write-block (Hook 6) and commit gate (Hook 2) both fail open silently because they use Bun's $ shell tag which throws synchronously "$ is not a function" in opencode 1.18.18. The withTimeout wrapper only catches async rejections, not sync throws, so the catch block fires and both hooks return (fail-open). Fix: replace $ with spawnSync (node:child_process) via DI injection points (gitBranch for Hook 6, runCmd for Hook 2) with array args + timeout. Also add --new <title> mode to worktree-create.ts that creates the worktree first, then creates the backlog task from within the worktree so main stays clean. See TASK-11 for the original implementation that documented this as "pre-existing, out of scope" but checked AC #3 anyway.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 --new <title> mode added to worktree-create.ts: infers next task ID, creates worktree, creates backlog task from within the worktree (cwd=wtPath) so task file lands on task branch not main
- [ ] #2 --new mode supports --dry-run, has --help text updated, KNOWN_FLAGS updated, AGENTS.md script inventory updated
- [ ] #3 Hook 6 (write-block) uses deps.gitBranch (spawnSync-based) instead of $ shell tag — no $ calls remain in Hook 6 path
- [ ] #4 Hook 2 (commit gate) uses deps.runCmd (spawnSync-based) instead of $ shell tag — no $ calls remain in Hook 2 path
- [ ] #5 gitBranch and runCmd are injectable via EnforceDeps with spawnSync defaults in createHooks (DI pattern preserved)
- [ ] #6 spawnSync uses array args (no shell injection), timeout option (no indefinite block), .trim() on stdout
- [ ] #7 withTimeout stays for Hooks 1 and 4 only (unchanged)
- [ ] #8 All Hook 6 and Hook 2 tests updated to mock gitBranch/runCmd; broken-$ fail-open test replaced with gitBranch/runCmd-throw fail-open; negative tests added
- [ ] #9 --new mode tests added to worktree-create.test.ts (fake CLI extended for task create, verifies task file in worktree not main)
- [ ] #10 Recovery runbook updated: Hook 6 added to table + activation checklist + known limitations note (edit/write only not MCP; spawnSync not $; exit trigger)
- [ ] #11 TASK-11 has a comment noting AC #3 was checked prematurely — fix landed in this task
- [ ] #12 cd ~/.agents/bin && bun test passes (all green)
- [ ] #13 Manual smoke test: write to ~/.agents on main → blocked with error message
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
## What was done

**Part A: --new <title> mode in worktree-create.ts**
- Infers next task ID from backlog task list (max numeric suffix + 1)
- Creates the worktree first, then creates the backlog task from within the worktree (cwd=wtPath) so the task file lands on the task branch — not on main
- Supports --dry-run, --help updated, KNOWN_FLAGS updated
- 6 new tests (23 total in worktree-create)

**Part B: enforce.ts fix**
- Hook 6 (write-block): replaced $ with gitBranch (spawnSync, array args, timeout, .trim(), fail-open on throw/empty)
- Hook 2 (commit gate): replaced both $ calls with runCmd (spawnSync, array args, timeout, fail-open on non-zero/null, re-throws FrontmatterViolationError on exit 1)
- Both added as injectable deps to EnforceDeps — preserves the DI pattern that 51 tests depend on
- Hooks 1 and 4 unchanged — still use $ + withTimeout (report-only/opt-in, fail-open is safe)
- 51 enforce-hooks tests pass (74 total across both files)

**Other updates**
- Recovery runbook: Hook 6 added to table, exit trigger documented, write-block scope noted (edit/write only, not MCP)
- TASK-11: comment added noting AC #3 was checked prematurely — fix landed in TASK-18
- AGENTS.md script inventory updated for --new mode

**Diff review**: glm APPROVE, kimi APPROVE, qwen REQUEST-CHANGES (unused test helpers — fixed and re-committed).

## Self-modifying merge note
This merge touches plugins/enforce.ts — the active copy at ~/.config/opencode/plugins/enforce.ts needs to be updated and opencode restarted for the write-block to actually take effect.
<!-- SECTION:FINAL_SUMMARY:END -->
