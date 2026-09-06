---
id: TASK-48
title: Reviewer specialization — per-reviewer lenses across the four model families
status: To Do
assignee: []
created_date: '2026-09-05 16:59'
updated_date: '2026-09-05 16:59'
labels: []
dependencies: []
priority: medium
type: enhancement
ordinal: 37000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Plan-gate and diff-reviewer subagents currently share one prompt per gate with different model families. Family diversity beats self-review, but all four reviewers look for the same things. Split the four reviewers per gate so each holds a distinct lens while KEEPING model-family diversity (lens added, not substituted). Diff lenses: code quality/simplification (YAGNI+DRY+SOLID+KISS), verification, best practices, security. Plan lenses: blind spots, red team, authenticity, Pareto. Sequenced after TASK-7/8 so prompts are not churned twice — ordering only, no dependency edge.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 WHEN diff review runs THEN the four diff-reviewer model families SHALL each hold a distinct lens (code quality/simplification YAGNI+DRY+SOLID+KISS, verification, best practices, security) while family diversity is preserved
- [ ] #2 WHEN plan review runs THEN the four plan-gate model families SHALL each hold a distinct lens (blind spots, red team, authenticity, Pareto) while family diversity is preserved
- [ ] #3 WHEN any specialized reviewer prompt is written THEN the lens SHALL be phrased primary with anything-goes-secondary so lens-exclusive blind spots are mitigated
- [ ] #4 WHEN the specialized reviewers return findings THEN a merge/dedup step SHALL consolidate overlapping findings before presentation to the human gate
<!-- AC:END -->
