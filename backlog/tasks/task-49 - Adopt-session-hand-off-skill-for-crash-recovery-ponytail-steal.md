---
id: TASK-49
title: 'Ponytail steal: adopt mattpocock/skills productivity suite (handoff anchor)'
status: To Do
assignee: []
created_date: '2026-09-05 16:59'
updated_date: '2026-09-07 16:42'
labels:
  - harness
  - spec-approved
dependencies: []
priority: medium
type: enhancement
ordinal: 38000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Evaluate the 7 productivity skills in mattpocock/skills skills/productivity (grill-me, grilling, handoff, teach, to-questionnaire, wait-what, writing-for-agents) for fit with the conductor flow and land the adopted adaptations. Why: no consistent session hand-off exists for crash recovery or thread rollover — the crash contract in docs/architecture/worktree-discipline.md has no auto-recovery in v1 (the human resets by hand); a hand-off artifact is the lightweight complement. Ponytail steal pattern (TASK-41): copy, evaluate fit, adapt or reject with recorded rationale. Distribution rule (grilled + plan-gated 2026-09-07; deepseek, qwen, kimi gates): content lives in skills — fold into an existing skill where an overlap exists; payload/AGENTS.md carries thin invariant or pointer lines only; a new skill only where nothing covers the job. handoff is the expected sole new skill (as-handoff) and the anchor deliverable. Evaluation is plan-phase research run by the researcher agent, landing a dated adopt/adapt/reject verdict table in docs/research/ that pins the upstream commit SHA, checks overlap against all 16 payload skills, and records rationale for every verdict including rejections; the table is referenced from the recorded plan. Attribution is non-negotiable: every adopted port ships frontmatter lineage (license, upstream, port date) and its ATTRIBUTION.md row update in the same change; the MrLesk/Backlog.md row is added when the PM distillation lands (sibling task B). Out of scope: Backlog.md CLI/config audit and DoD backfill (sibling task A), PM-agent distillation (sibling task B), backlog MCP re-enable.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 WHEN the evaluation runs THEN a dated adopt/adapt/reject verdict table for all 7 upstream skills SHALL land in docs/research/ with per-skill distribution target, catalog-overlap check against all 16 payload skills, pinned upstream commit SHA, and rationale for every verdict including rejections
- [ ] #2 WHEN an upstream skill is adopted into an existing skill THEN the fold SHALL land in that skill with its trigger surface updated and without duplicating the overlapping skill job
- [ ] #3 WHEN an upstream skill is adopted as a new skill THEN it SHALL ship with the as- prefix, frontmatter lineage (license, upstream, port date), and its ATTRIBUTION.md lineage row updated in the same change
- [ ] #4 IF the handoff skill is adopted THEN the as-handoff port SHALL capture rejected and load-bearing decisions (mattpocock/skills#186 failure mode) and SHALL compose with backlog lifecycle fields rather than a parallel sidecar state file
- [ ] #5 WHEN the handoff mechanism is chosen THEN docs/architecture/worktree-discipline.md crash contract SHALL gain a pointer to the hand-off artifact as the lightweight complement to manual reset
- [ ] #6 IF more than 4 skills excluding the handoff anchor are adopted as new ports THEN the split valve SHALL fire at plan review producing per-skill child tasks each routed through its own spec gate
- [ ] #7 WHEN payload/AGENTS.md gains any line from this work THEN it SHALL be a thin invariant or pointer line with content living in skills
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Tests and lint pass with fresh output in the worktree
- [ ] #2 Worktree is clean (no uncommitted changes)
- [ ] #3 Branch is rebased on main and green
- [ ] #4 All acceptance criteria checked with fresh evidence (one at a time, never batched)
<!-- DOD:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: conductor
created: 2026-09-07 16:38
---
Revive trigger: conductor grilling session 2026-09-07 — user expanded scope from handoff-only to the full mattpocock/skills productivity suite (option A) and approved the amended shape after three plan-gate reviews (deepseek NO-GO reshaped; qwen GO-WITH-CHANGES; kimi tie-break chose B on the PM-agent question: no agent, distill as skill or prose). Label change deferred -> harness per the decision-table first match (modifies skills, payload/AGENTS.md, docs/architecture). DoD added directly to this task so sibling task A (DoD backfill on pre-TASK-51 tasks) excludes it. Original 3 ACs preserved in spirit: old #2 and #3 folded into new AC #4; old #1 superseded by new AC #1.
---
<!-- COMMENTS:END -->
