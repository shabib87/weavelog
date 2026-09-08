---
id: TASK-36
title: Bypass discipline - conductor rule + strip bypass recipe from hook message
status: Done
assignee:
  - conductor
created_date: '2026-09-03 01:38'
updated_date: '2026-09-03 04:17'
labels: []
dependencies: []
references:
  - docs/research/2026-08-29-backlog-mcp-enforcement-bypass.md
ordinal: 28000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Incident: conductor edited backlog files on main via CLI (invisible to enforce.ts write-block), then read the bypass recipe from the pre-commit hook own block message and committed on main with ENFORCE_DISABLED=true. Fix closes the teaching path and codifies the rule; the write-block bash-CLI blind spot is a named deferral, not in scope.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 WHEN the Bypass bullet under Rules in docs/trd/worktree-discipline.md is read THEN it states that ENFORCE_DISABLED=true and git commit --no-verify are permitted only to merge an approved task branch onto main, and must never be used for direct edits or commits on main outside an approved merge
- [x] #2 WHEN AGENT-STACK-RUNBOOK.md bypass prose is read THEN it matches the same merge-only restriction or points to worktree-discipline.md as the single source
- [x] #3 WHEN the hook source (bin/src/worktree-create.ts HOOK_CONTENT lines 48-60) and the live .git/hooks/pre-commit are inspected THEN the exact "# Block commits on main." marker is present AND no line contains the substring "Bypass" or "--no-verify"
- [x] #4 WHEN a commit on main is attempted THEN the block message still contains "Blocked: no commits on" AND no longer names ENFORCE_DISABLED or --no-verify
- [x] #5 WHEN "sh .git/hooks/pre-commit" runs on main with ENFORCE_DISABLED unset THEN it exits 1, and WHEN ENFORCE_DISABLED=true is set THEN it exits 0 (bypass still works for approved merges)
- [x] #6 WHEN worktree-create.ts runs in a repo whose live hook lacks the new content THEN handleHook rewrites the stale hook (stale-hook rewrite rule + test in worktree-create.test.ts)
- [x] #7 WHEN the backlog is read THEN a named-deferral task or backlog decision exists for the enforce.ts bash-CLI blind spot (backlog MCP enforcement-bypass note, lines 106-121)
- [x] #8 WHEN the enforce.ts write-block or backlog gate blocks an action on main THEN the block message contains no bypass command or flag name (no ENFORCE_DISABLED, no --no-verify) and points at docs/trd/worktree-discipline.md
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. worktree-discipline.md: rewrite Bypass bullet - merge-only rule. 2. AGENT-STACK-RUNBOOK.md: align bypass prose to point at worktree-discipline.md as SSOT. 3. worktree-create.ts HOOK_CONTENT: strip Bypass clause from comment line 49 (preserve exact marker) + stderr line 56. 4. handleHook: rewrite stale ours-hook when content differs from HOOK_CONTENT. 5. Update live .git/hooks/pre-commit via the new rewrite path. 6. Tests: HOOK_CONTENT no-Bypass assertion + stale-hook rewrite test. 7. Verify block/bypass behavior on main. 8. biome + bun test. 9. Diff review, human gate, merge.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Validation: bun test 353 pass / 0 fail (full suite); biome check --write clean. Live hook rewritten via new stale-rewrite path (bun .worktrees/TASK-36/bin/src/worktree-create.ts TASK-24 -> hook=stale rewritten). Behavior: unset exit 1, ENFORCE_DISABLED=true exit 0; block message points to docs, no recipe. TASK-37 created as named deferral (lands on task branch, visible on main after merge).

Round-3 (all 4 families): deepseek+GLM caught enforce.ts changes UNCOMMITTED - committed; Hook 7 no-recipe pin added; FOREIGN byte-preservation assertion added; runbook stale-rewrite one-liner added; verify-gate/allow-live-edit strings tracked on TASK-37. Suite: 356 tests, 0 fail. Flake: 3 lifetime sightings, 7+ consecutive clean, not reproduced - capture name on next occurrence.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: conductor
created: 2026-09-03 04:02
---
Follow-up candidates for TASK-37 design pass (round-3 review finds): plugins/verify-gate.ts:98 teaches VERIFY_GATE_DISABLED=true to bypass; plugins/enforce.ts:500 teaches ENFORCE_ALLOW_LIVE_EDIT=true. Both are scoped intentional overrides, NOT the main-protection path — track their consistency separately.
---
<!-- COMMENTS:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Closed both teaching paths for the main-commit bypass: pre-commit hook (HOOK_CONTENT) and enforce.ts write-block + backlog-gate messages now point at docs/trd/worktree-discipline.md instead of printing ENFORCE_DISABLED/--no-verify; hook source kept the exact ours-marker; handleHook rewrites stale ours-hooks (FOREIGN untouched, dry-run safe). Docs: merge-only bypass rule in worktree-discipline.md + runbook alignment + stale-rewrite semantics documented. Tests: 356 pass / 0 fail, incl. 4 new pins (no-recipe, stale-rewrite, dry-run-no-rewrite, both gate messages recipe-free, FOREIGN byte-preserved). Verified live: hook blocks exit 1 / bypass exit 0 / message recipe-free. All 8 ACs evidence-checked. 4 fresh-context reviews (qwen APPROVE, deepseek/kimi/GLM APPROVE-WITH-FIXES) - majors and actionable minors resolved. TASK-37 records the enforce.ts bash-CLI blind spot (design pass required); flake + biome drift noted as follow-ups.
<!-- SECTION:FINAL_SUMMARY:END -->
