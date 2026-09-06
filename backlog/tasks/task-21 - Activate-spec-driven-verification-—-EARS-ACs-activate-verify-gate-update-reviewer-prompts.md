---
id: TASK-21
title: >-
  Activate spec-driven verification — EARS ACs + activate verify-gate + update
  reviewer prompts
status: Done
assignee:
  - conductor
created_date: '2026-08-29 06:21'
updated_date: '2026-08-30 03:50'
labels: []
milestone: m-0
dependencies: []
priority: high
type: enhancement
ordinal: 13000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Activate the existing verify-gate.ts hook (copy to ~/.config/opencode/plugins/), establish EARS-style WHEN/THEN as the acceptance criteria format, update reviewer.md and plan-reviewer.md to check against EARS ACs, add --new mode + MCP-disabled note to AGENTS.md, update runbook verify-gate section, reconcile verify-with-criteria SKILL.md. No new artifact files — backlog.md task fields ARE the spec-driven chain.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 WHEN verify-gate.ts is copied to ~/.config/opencode/plugins/ THEN it is active and blocks code writes after >10 tool calls without a bash run
- [x] #2 WHEN a task has acceptance criteria THEN they use EARS-style format (WHEN/IF/WHILE/THEN) documented in AGENTS.md
- [x] #3 WHEN reviewer.md is updated THEN it checks diff against task acceptance criteria (EARS-style) not stated intent/plan
- [x] #4 WHEN plan-reviewer.md is updated THEN it accepts EARS-style WHEN/THEN not just Given/When/Then
- [x] #5 WHEN AGENTS.md is updated THEN it documents --new mode, MCP-disabled note, and the spec-driven chain (backlog fields = artifacts)
- [x] #6 WHEN the runbook verify-gate section is updated THEN it says ACTIVE not NOT ACTIVE
- [x] #7 WHEN verify-with-criteria SKILL.md is reconciled THEN line 17 accurately describes the verify-gate hook mechanism
- [x] #8 WHEN cd ~/.agents/bin && bun test is run THEN all tests pass
- [ ] #9 WHEN the conductor finishes diff review THEN it presents findings to the user and waits for merge approval before merging (HITL gate documented in AGENTS.md)
- [ ] #10 WHEN a new task is needed THEN the conductor uses --new <title> mode which creates the worktree first and creates the task from within the worktree
- [ ] #11 WHEN an existing task is picked up THEN the conductor uses <task-id> mode to create the worktree (only if it doesn't already exist)
- [ ] #12 WHEN AGENTS.md is updated THEN it documents the full task lifecycle: new task flow (--new) vs existing task pickup (<task-id>) vs merge gate (HITL)
- [ ] #13 WHEN the conductor runs backlog task create or backlog task edit --status on main THEN it is blocked by a hook (enforce.ts or new hook)
- [ ] #14 WHEN the --new flag is used THEN it is renamed to --create in worktree-create.ts (clearer naming: creates a task, not just 'new something')
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Activated spec-driven verification + HITL merge gate + Hook 7 + --create rename.

1. verify-gate.ts activated (copied to ~/.config/opencode/plugins/)
2. EARS-style WHEN/THEN documented in AGENTS.md
3. reviewer.md + plan-reviewer.md updated for EARS
4. --new renamed to --create in worktree-create.ts
5. Hook 7 added to enforce.ts — blocks backlog task create/edit --status on main
6. HITL merge gate documented as MUST in AGENTS.md
7. Full task lifecycle documented (new, existing, --ready)
8. 6 Hook 7 tests added (80 total tests pass)
9. Edge cases verified: read-only commands allowed, non-status edits allowed, --create flag works

Diff review: kimi REQUEST-CHANGES (--new leftover + no Hook 7 tests), qwen REQUEST-CHANGES (same), glm REQUEST-CHANGES (same). All fixed in round 1.
<!-- SECTION:FINAL_SUMMARY:END -->
