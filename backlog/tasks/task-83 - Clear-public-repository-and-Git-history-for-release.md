---
id: TASK-83
title: Clear public repository and Git history for release
status: To Do
assignee: []
created_date: '2026-09-11 04:29'
updated_date: '2026-09-20 08:20'
labels: []
milestone: m-5
dependencies:
  - TASK-79
priority: high
type: task
ordinal: 66000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Outcome: independently clear the repository and every published Git ref for public release. Why: npm artifact safety does not prove that source history is safe to publish.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 WHEN the clearance runs THEN it audits the working tree and every Git ref for personal data, secrets, private paths, and licensing issues and records the scope and results
- [ ] #2 WHEN findings are resolved THEN three independent reviews confirm the public-source decision separately from TASK-54 npm artifact safety
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Tests and lint pass with fresh output in the worktree
- [ ] #2 Worktree is clean (no uncommitted changes)
- [ ] #3 Branch is rebased on main and green
- [ ] #4 All acceptance criteria checked with fresh evidence (one at a time, never batched)
<!-- DOD:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-09-20 scope absorbed from a withdrawn new task (per user: do not create new tasks): this clearance also owns the one-time privacy sweep. TASK-73 externalized the privacy gate so the shipped package carries no personal literal; the repository still holds real-name variants, absolute home paths, and personal email in provenance surfaces. Sweep: scan the working tree with the local needle set plus the generic rules, record offenders with file:line, treat attribution surfaces (LICENSE, NOTICE, ATTRIBUTION.md, README/prd trademark lines, payload/skills author fields) as intentionally allowed, fix or explicitly decide genuine leaks, and narrow/remove the temporary .weavelog-privacy-excludes at the repo root. Input: the 8 shipped payload/skills/*/SKILL.md carry 'author: github:@shabib87' (public brand per TASK-45 [AMEND-R6-6], not PII) — decide strip vs allow when local needles go live.
<!-- SECTION:NOTES:END -->
