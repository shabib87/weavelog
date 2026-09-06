---
id: TASK-22
title: >-
  Restore loop-model consensus — reconcile 3-phase x 2-role in TASK-15 + global
  AGENTS.md + runbook P5b
status: Done
assignee:
  - '@conductor'
created_date: '2026-08-30 15:40'
updated_date: '2026-08-30 15:55'
labels: []
dependencies: []
ordinal: 14000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Restore the loop-model consensus that commit 6366cc0 deleted as collateral damage of the Gherkin->EARS cleanup. The 3-phase WHY/WHAT/HOW x 2-role inner/outer model is correct and was decided by 3-reviewer consensus (kimi+qwen+deepseek) + 4-reviewer plan review; commit 6366cc0 compressed TASK-15's description and deleted the justification block, leaving the assertion dangling without rationale and AGENTS.md's 'Two-loop factory model' section contradicting the user's mental model. Canonical model: THREE PHASES (WHY/WHAT/HOW) x TWO LOOP ROLES (inner=agent execution cycle, outer=human decision ownership, ONE boundary across all phases). WHY is the research half of WHAT, not a separate loop. Do NOT write '3 loops' anywhere — phases progress, loops repeat. Fix: (1) restore the consensus block (EARS-ified) into TASK-15's description, (2) amend the global AGENTS.md (~/.config/opencode/AGENTS.md) 'Two-loop factory model' section to name WHY as a phase and state the 3-phase x 2-loop reconciliation, (3) sweep downstream 'two-loop' references in runbook P5b + AGENTS.md line 60/70 to 'three-phase model'.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 WHEN TASK-15's description is read THEN it contains the 3-reviewer consensus block (WHY/WHAT/HOW are phases not loops; inner/outer is ONE boundary; 2 gates both in HOW; WHAT uses dialogue not gate; EARS-style ACs are a WHAT-phase concern) with Gherkin refs EARS-ified
- [x] #2 WHEN the global AGENTS.md is read THEN its factory-model section names WHY as a phase and states the 3-phase x 2-loop-role reconciliation; it does NOT say '3 loops'
- [x] #3 WHEN the live operational docs (global AGENTS.md, repo AGENTS.md, runbook, research README index) are grepped for 'two-loop' THEN surviving references are reconciled to 'three-phase' or documented as historical
- [x] #4 WHEN the runbook P5b block is checked THEN it carries the core behavior rules sections (Conductor pattern through Model routing) and no factory-model section; the factory-model rename therefore requires no P5b sync, and any pre-existing P5b staleness (sections added after P5b capture) is noted as follow-up
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Restore consensus block (EARS-ified) into TASK-15 description via backlog task edit (from TASK-22 worktree). 2. Amend global ~/.config/opencode/AGENTS.md 'Two-loop factory model' section: rename to name 3 phases x 2 loop roles, WHY as research-half of WHAT, ONE inner/outer boundary. 3. Sweep repo + global for 'two-loop' refs (runbook P5b verbatim copy, AGENTS.md lines 60/70) -> 'three-phase model'. 4. Validate: grep checks, frontmatter-check, backlog task view shows restored block, AGENTS.md edit diff. 5. Diff review (cross-model), present for merge approval.
<!-- SECTION:PLAN:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: @conductor
created: 2026-08-30 15:53
---
Diff review: diff-reviewer-qwen APPROVE (verified consensus block restored, global AGENTS.md names WHY + 3-phase x 2-role, sweep clean, no over-reach; 1 LOW finding — TASK-16 description section name, fixed in d1fb8d1). diff-reviewer-kimi APPROVE (all 6 verification targets pass; P5b staleness pre-existing + deferred to TASK-16 AC #8; AC #3/#4 amendments accurate). No blocking issues. Held at In Review awaiting human merge approval.
---
<!-- COMMENTS:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Restored the loop-model consensus deleted by commit 6366cc0 (collateral damage of the Gherkin→EARS cleanup). Canonical model confirmed by 2 independent adjudicators (qwen + kimi): THREE PHASES (WHY/WHAT/HOW) x TWO LOOP ROLES (inner=agent execution, outer=human ownership, ONE boundary across all phases) — NOT '3 loops'. Restored EARS-ified consensus block into TASK-15 description; amended global AGENTS.md section to 'Factory model: three phases, two loop roles' naming WHY as a phase; swept live 'two-loop' refs (runbook line 2431, research README index) to three-phase; TASK-16 plan + description reconciled. Verified: grep sweeps clean, no '3 loops' anywhere, P5b needs no sync (never carried factory section; pre-existing staleness tracked in TASK-16 AC #8). Diff review: qwen APPROVE + kimi APPROVE, 0 blocking findings. All 4 ACs checked.
<!-- SECTION:FINAL_SUMMARY:END -->
