---
id: TASK-57
title: Name research — choose the final OSS name (spike)
status: To Do
assignee: []
created_date: '2026-09-06 07:26'
labels: []
dependencies: []
priority: high
type: spike
ordinal: 45000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Outcome: a ratified final OSS name replacing 'flightlead' (user is unsatisfied with the name; decision 2026-09-06). Deliverable = shortlist of 3-5 candidates each with: npm availability (registry search + exact-name check), GitHub repo/org name availability, domain plausibility, quick trademark/conflict sanity check (existing OSS projects with similar names), pronunciation/spelling robustness, and fit with the product (the inner harness: agent work you can audit). Human makes the final pick; this task ONLY researches and presents. Why: rename-everything is the highest-priority follow-up of the port (user decision 2026-09-06) and must complete BEFORE the name-bearing pre-publish work (TASK-53 voice-pass, TASK-56 cleanup, TASK-55 hooks, publish) to avoid doing them twice. Research method: researcher subagent for landscape/availability, human ratifies shortlist then final pick in-thread.
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Tests and lint pass with fresh output in the worktree
- [ ] #2 Worktree is clean (no uncommitted changes)
- [ ] #3 Branch is rebased on main and green
- [ ] #4 All acceptance criteria checked with fresh evidence (one at a time, never batched)
<!-- DOD:END -->
