---
id: TASK-89
title: Update mixed-provider roster for DeepSeek V4.1
status: To Do
assignee: []
created_date: '2026-09-15 05:20'
updated_date: '2026-09-15 05:59'
labels:
  - spec-approved
dependencies: []
documentation:
  - docs/research/2026-09-11-deepseek-v4.1-flash-evaluation-hold.md
  - docs/trd/model-routing.md
type: enhancement
ordinal: 71000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Update the shipped mixed-provider model roster after DeepSeek retired V4 Flash and began routing legacy Flash and V4 Pro names to V4.1 Flash. The outcome is a truthful, consistent OpenCode configuration and model-routing evidence: Terra is the foreground conductor, Luna is the low-cost subscription helper, DeepSeek V4.1 Flash is the OpenRouter worker/scout default, and GLM-5.3 Flash remains the OpenRouter scout/visual/L0-review route. This task updates roster configuration, agent bindings, manifest and documentation together. It does not add provider-aware reviewer-loop orchestration or automatic subscription-quota routing.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 WHEN a newly synced OpenCode configuration starts a foreground session THEN its default model is ChatGPT-subscription Terra and its small helper model is ChatGPT-subscription Luna.
- [ ] #2 WHEN an OpenRouter worker or scout is dispatched THEN it uses DeepSeek V4.1 Flash, and the configuration records the resolved model/provider identity needed to detect an upstream alias change.
- [ ] #3 WHEN routine visual work or L0 review is dispatched THEN it continues to use GLM-5.3 Flash, and all unmentioned existing agent roles and provider pins remain unchanged.
- [ ] #4 WHEN the DeepSeek V4.1 Flash research record is read THEN it accurately records the September 2026 retirement/rerouting change, distinguishes vendor claims from independent seat evidence, and supersedes or revises the former hold without inventing benchmark proof.
- [ ] #5 WHEN manifest, payload configuration, agent profiles, and model-routing documentation are checked THEN their model IDs and provider routes agree, and focused tests plus the existing config/manifest checks pass.
- [ ] #6 WHEN reviewer-loop.ts is inspected after this task THEN it has not gained subscription-provider routing; that provider-aware orchestration remains deferred to its dedicated task.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Tests and lint pass with fresh output in the worktree
- [ ] #2 Worktree is clean (no uncommitted changes)
- [ ] #3 Branch is rebased on main and green
- [ ] #4 All acceptance criteria checked with fresh evidence (one at a time, never batched)
<!-- DOD:END -->
