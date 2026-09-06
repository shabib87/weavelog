---
id: TASK-53
title: 'Pre-publish: voice-pass of user-facing prose in flightlead'
status: To Do
assignee: []
created_date: '2026-09-05 23:39'
updated_date: '2026-09-06 21:54'
labels: []
milestone: m-7
dependencies:
  - TASK-58
  - TASK-56
  - TASK-59
priority: high
ordinal: 41000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Outcome: all user-facing prose in ~/Projects/flightlead (README.md, NOTICE, CHANGELOG.md, CONTRIBUTING.md, SECURITY.md, docs spine NORTH_STAR/PRODUCT/ROADMAP/cli.md, CLI help text once built) passes a voice pass so the public v0.1.0 reads in the author's voice and carries zero AI-writing tells. Why: TASK-45 PORT PLAN v8 Step 0.4 gates tag/publish on this ticket (publish-gate marker .github/publish-gate flips ONLY when 0.4+0.5 are closed). Run the in-my-voice + remove-ai-slop skills over the prose; personal in-my-voice skill stays at ~/.agents/skills/in-my-voice and is not ported.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 WHEN the voice-pass runs over all user-facing prose in ~/Projects/flightlead THEN zero AI-writing tells remain per the remove-ai-slop checklist and the prose reads in the author's voice, verified by a fresh diff review
- [ ] #2 IF the pass edits any file THEN the change SHALL be committed to flightlead main before the publish-gate marker flips
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Tests and lint pass with fresh output in the worktree
- [ ] #2 Worktree is clean (no uncommitted changes)
- [ ] #3 Branch is rebased on main and green
- [ ] #4 All acceptance criteria checked with fresh evidence (one at a time, never batched)
<!-- DOD:END -->
