---
id: TASK-90
title: Add provider-aware reviewer-loop routing
status: To Do
assignee: []
created_date: '2026-09-15 05:52'
updated_date: '2026-09-15 05:56'
labels:
  - deferred
  - spec-approved
dependencies:
  - TASK-89
documentation:
  - src/tools/reviewer-loop.ts
  - src/runner/session.ts
  - docs/adr/0007-independent-review-policy.md
priority: low
type: enhancement
ordinal: 72000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Replace the raw OpenRouter-only reviewer-loop helper with provider-aware review routing after v0.1. It will use ChatGPT Pro OAuth through the OpenCode SDK as well as OpenRouter, preserve fresh-context review, report cross-family availability, and keep subscription allowance separate from OpenRouter cash cost. It is deferred until v0.1 ships and a demonstrated review workflow needs a subscription route.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 WHEN a review run starts THEN it receives or resolves the author model, provider, and family before selecting reviewers, and it refuses to claim cross-family independence when that evidence is absent.
- [ ] #2 WHEN Sol is selected for an eligible independent review THEN the loop invokes the OpenCode SDK through the ChatGPT subscription route rather than sending a paid OpenRouter or API-key request.
- [ ] #3 WHEN Terra or Luna authored the artifact THEN the required independent review selects an eligible non-OpenAI family before Sol can be reported as an optional extra opinion.
- [ ] #4 WHEN a normal OpenRouter review runs THEN GLM-5.3 Flash remains the inexpensive default, and Kimi runs only with an explicit second-opinion request.
- [ ] #5 WHEN a mixed-provider review report is written THEN it records linked author/reviewer identities, family availability, actual provider route, verdict, OpenRouter USD, and subscription-route usage without fabricating a dollar cost for included allowance.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Tests and lint pass with fresh output in the worktree
- [ ] #2 Worktree is clean (no uncommitted changes)
- [ ] #3 Branch is rebased on main and green
- [ ] #4 All acceptance criteria checked with fresh evidence (one at a time, never batched)
<!-- DOD:END -->
