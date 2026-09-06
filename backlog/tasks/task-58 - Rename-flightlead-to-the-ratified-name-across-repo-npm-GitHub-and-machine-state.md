---
id: TASK-58
title: >-
  Rename flightlead to the ratified name across repo, npm, GitHub, and machine
  state
status: To Do
assignee: []
created_date: '2026-09-06 07:27'
labels:
  - harness
dependencies:
  - TASK-57
priority: high
type: chore
ordinal: 46000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Outcome: the project carries ONE name everywhere — code, docs, npm, GitHub, machine state — with zero stale references in tracked files. Scope (the hassle map, ratified 2026-09-06): (1) in-repo sweep: package.json name+bin, flightlead.json manifest (filename becomes <name>.json + all references), CLI help/output strings, tests pinning those strings, README/NOTICE/ATTRIBUTION trademark lines ('<name> name/logo (c) Shabib Hossain — not covered by the code license'), docs spine + docs/architecture + CHANGELOG; (2) npm: abandon the 0.0.0 placeholder, claim <name> (2FA publish by human, minimal placeholder or straight to real publish if all gates allow); (3) GitHub: rename repo (human, redirects), git remote set-url; (4) machine state: mv ~/.local/state/flightlead -> ~/.local/state/<name>, rewrite com.flightlead.check plist (label <name>.check, pinned argv, logs path), bootout/bootstrap, doctor verify; (5) optional human call: ~/Projects/flightlead dir rename. Why: user finds the name unsatisfying and ratified rename-everything as the highest-priority post-port task (2026-09-06); doing it now (pre-0.1.0, pre-public) costs one mechanical session vs breaking install docs post-publish. Preconditions: TASK-57 ratifies the name. Postcondition wiring: this task blocks TASK-53, TASK-55, TASK-56, and the publish flow. Precedent: the loopeng->flightlead rename (commit 7a3bd18) was the same operation.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 WHEN the rename completes THEN grep across tracked files SHALL find zero occurrences of the old name outside git history and backlog/ historical task text, and every occurrence of the new name SHALL be consistent (package.json, manifest, CLI output, docs, plist)
- [ ] #2 WHEN the new LaunchAgent is loaded THEN the renamed CLI check --stack-only SHALL exit 0 from the pinned argv and the old com.flightlead.check plist SHALL be bootout-ed and deleted with doctor green
- [ ] #3 IF the npm name is free THEN it SHALL be claimed under the human's account (shabibhossain) with a minimal placeholder or the real publish, verified via npm view
- [ ] #4 WHEN all gates re-run (npm test, tsc, biome, privacy-audit, doctor, check, backlog task list) THEN all SHALL exit green with the new name
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Tests and lint pass with fresh output in the worktree
- [ ] #2 Worktree is clean (no uncommitted changes)
- [ ] #3 Branch is rebased on main and green
- [ ] #4 All acceptance criteria checked with fresh evidence (one at a time, never batched)
<!-- DOD:END -->
