---
id: TASK-13
title: >-
  Fix backlog.md utilization — wire conductor pattern to backlog.md lifecycle
  fields, use board, run agents --update-instructions
status: Done
assignee:
  - '@conductor'
created_date: '2026-08-28 23:08'
updated_date: '2026-08-30 02:54'
labels:
  - v1
  - immediate
  - merged
milestone: m-0
dependencies: []
modified_files:
  - AGENTS.md
priority: high
type: task
ordinal: 900
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Fix backlog.md utilization — wire conductor pattern to backlog.md lifecycle fields, use board, run agents --update-instructions. ACs use EARS-style format (not Gherkin — backlog.md does NOT support Given/When/Then, ACs are plain strings).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 AGENTS.md maps conductor flow to backlog.md fields: --plan (not docs/plans/), --notes, --comments, --modified-files, --final-summary, --check-ac (per-AC as proven, not batch); validate = tests/lint THEN --check-ac; board/browser are human tools; conductor uses task list / board export for kanban
- [x] #2 Three review checkpoints documented in AGENTS.md: checkpoint 1 = spec review (description + AC, before In Progress), checkpoint 2 = plan review (--plan, before implementation), checkpoint 3 = code review (diff-reviewer before merge)
- [x] #3 backlog agents --update-instructions run; AGENTS.md instructions block matches installed binary version; deferrals noted with triggers: onStatusChange (v2 push notifications), backlog decision (next arch decision), --due-date (time-boxed work)
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Provision worktree task/TASK-13. 2. Rewrite AGENTS.md spec-driven section: map conductor flow to backlog CLI fields (--plan not docs/plans/, --notes, --comment/--comment-author, --modified-file, --final-summary, --check-ac per-AC after tests/lint). 3. Add three review checkpoints (spec review before In Progress; plan review on --plan before implementation; code review diff-reviewer before merge). 4. Note deferrals with triggers (onStatusChange v2, backlog decision next arch decision, --due-date time-boxed work). 5. Run backlog agents --update-instructions + verify version 1.50.1 == installed binary. 6. HOLD: human merge approval, then finalize (check-ac, final-summary, merge).
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Validation so far: diff-reviewer-qwen returned APPROVE (confirmed all flags via --help; --modified-file is the real singular flag). backlog agents --update-instructions ran -> 'Updated 1 agent instruction file(s): AGENTS.md'. Managed block 1.50.1 == installed binary 1.50.1. Held at In Review awaiting human merge approval (HITL gate) — do NOT merge to main without human nod.

Human merge approval obtained (post qwen+glm cross-family review, both APPROVE, --append-plan fix applied). Merged task/TASK-13 -> main (4eeb2ab).
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Wired conductor pattern to backlog.md lifecycle fields in AGENTS.md: replaced JSON field-name chain with CLI-flag mapping table (--plan/--append-plan not docs/plans/, --notes, --comment, --modified-file, --final-summary, --check-ac one-at-a-time), added three review checkpoints (spec/plan/code), board/browser-as-human-tools, and named deferrals (onStatusChange, backlog decision, --due-date). Verified: diff-reviewer-qwen APPROVE + diff-reviewer-glm APPROVE; backlog agents --update-instructions updated AGENTS.md; managed block 1.50.1 == installed binary; human approved merge; merged task/TASK-13 -> main (4eeb2ab).
<!-- SECTION:FINAL_SUMMARY:END -->
