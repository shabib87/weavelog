---
id: TASK-12
title: 'v1 — Dogfood: one real task shipped end-to-end through the full flow'
status: Done
assignee:
  - '@conductor'
created_date: '2026-08-25 05:37'
updated_date: '2026-08-30 06:46'
labels:
  - v1
milestone: m-1
dependencies:
  - TASK-11
  - TASK-13
  - TASK-21
priority: high
type: task
ordinal: 1500
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Prove the v1 inner harness works by shipping one real backlog task through the complete flow end-to-end. This is the finish line for v1 — not "all scripts written" but "one real task actually shipped through the guardrails."

The flow:
1. Conductor selects one real backlog task (or creates one)
2. Conductor runs worktree-create.ts to create .worktrees/<task-id> with branch task/<task-id>
3. Conductor dispatches a subagent into the worktree (Task tool, workdir=.worktrees/<task-id>)
4. The subagent does the work (TDD: writes a failing test first, then makes it pass)
5. Conductor validates manually: runs tests + lint, checks working tree is clean
6. Conductor merges manually: git merge task/<task-id> back to main
7. Backlog task moves to Done

The pre-commit hook MUST block at least one attempt to commit directly on main (this proves the guardrail works). The enforce.ts write-block MUST block at least one write attempt on main (this proves the belt works).

This task depends on TASK-11 (the guardrails must exist before dogfooding).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 One real backlog task shipped through the full flow (backlog → spec → plan → worktree → validate → merge → Done); worktree created via worktree-create.ts at .worktrees/<task-id> with branch task/<task-id>
- [x] #2 The pre-commit hook blocked at least one direct commit attempt on main (verified — the hook fired and blocked; also verified hook does NOT block commits on task/* branches)
- [x] #3 The enforce.ts write-block blocked at least one edit/write attempt on main (verified — the block fired before the write landed)
- [x] #4 The subagent worked in the worktree (not on main) — dispatched via Task tool with workdir=.worktrees/<task-id>
- [x] #5 Tests pass and lint is clean (conductor runs the validation commands manually)
- [x] #6 The worktree branch was rebased on current main before merging (if main moved since worktree creation); merged back to main manually (git merge with ENFORCE_DISABLED=true or --no-verify to bypass the hook for the conductor-authorized merge — the hook blocks accidental commits, not intentional merges)
- [x] #7 The backlog task is Done and visible on the board (backlog task list shows it as Done)
- [x] #8 One merged commit on main from the worktree branch (git log shows the merge commit; conductor used bypass for the intentional merge, not by disabling the hook permanently)
- [x] #9 Conductor session restarted after TASK-11 merge so the new enforce.ts write-block code is loaded before dogfooding (self-modification hazard: enforce.ts is a live opencode plugin; the running session must restart to pick up the new write-block)
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Pick dogfood target: TASK-20 (m-1, deps satisfied, research doc complete, remaining scope = stack-check proxy doctor command, TDD-able). 2. Create worktree task/TASK-20 via worktree-create.ts, set In Progress, record plan. 3. Dispatch implementer subagent into .worktrees/TASK-20 (Task tool, workdir=.worktrees/TASK-20): adds 'stack-check proxy' subcommand (checks health 127.0.0.1:8788, mode=cache, pi models.json baseUrl, opencode baseURL, headroom extension presence, settings.json thresholds; actionable errors; happy+unhappy tests). 4. Prove guardrails: pre-commit hook blocks a commit on main (attempt one, expect block); enforce.ts write-block blocks an edit/write on main (attempt via write tool, expect throw). 5. Conductor validates: bun test in bin/, biome lint, clean tree, green vs rebased main. 6. Diff review (cross-model), present findings, human merge approval, merge task/TASK-20 -> main, mark TASK-20 Done. 7. Mark TASK-12 ACs per-AC, final summary, merge TASK-12 worktree, restart session if bin/src or plugins changed.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Dogfood execution: TASK-20 picked as target (user-approved). Worktree created via worktree-create.ts at .worktrees/TASK-20 (branch task/TASK-20). Implementer dispatched into worktree. Guardrails proven: (1) pre-commit hook blocked direct commit on main (exit 1, 'Blocked: no commits on main'), (2) enforce.ts write-block blocked a write on main ('Blocked: no file writes on main', no file created), (3) hook allowed commit on task branch (commit 23c2836). Conductor validation: bun test 251 pass/0 fail, biome clean (2 pre-existing warnings), positive+negative --proxy smoke verified. Diff review: qwen/glm/deepseek all APPROVE (after one fix round). TASK-20 worktree branch based on current main (600a5f0) — no rebase needed. Awaiting human merge approval.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Dogfood complete: TASK-20 shipped end-to-end through the v1 inner harness. backlog->spec->plan->worktree(task/TASK-20 via worktree-create.ts)->implementer dispatch (workdir=.worktrees/TASK-20)->validate->cross-model diff review->merge->Done. Guardrails proven: pre-commit hook blocked a direct commit on main (exit 1) and allowed task-branch commits; enforce.ts write-block blocked a write on main (no file created). Conductor validation: bun test 251 pass/0 fail, biome clean (2 pre-existing), positive+negative --proxy smoke. Diff review: qwen/glm/deepseek all APPROVE after one fix round. TASK-20 merged 5d1e81c, marked Done on board. All 9 ACs checked.
<!-- SECTION:FINAL_SUMMARY:END -->
