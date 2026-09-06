---
id: TASK-48
title: Reviewer specialization — per-reviewer lenses across the four model families
status: To Do
assignee: []
created_date: '2026-09-05 16:59'
updated_date: '2026-09-06 17:52'
labels: []
dependencies:
  - TASK-61
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

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-09-06 DAG wiring: dependency edge added on TASK-61 (dynamic model routing research) — the Kimi K3 keep/drop and 4-vs-3 reviewer decision lands there first, so lens mapping waits for the roster answer. Ordering-only edges on TASK-7/8 kept per original intent.

2026-09-06 correction: TASK-7/8 remain ordering-only per original description (no edges). Single added edge: TASK-61.
<!-- SECTION:NOTES:END -->
