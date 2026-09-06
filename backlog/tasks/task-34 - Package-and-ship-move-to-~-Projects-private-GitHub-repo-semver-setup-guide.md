---
id: TASK-34
title: >-
  Package and ship: move to ~/Projects + private GitHub repo + semver + setup
  guide
status: Done
assignee: []
created_date: '2026-09-03 01:05'
updated_date: '2026-09-06 16:51'
labels: []
milestone: m-3
dependencies: []
priority: medium
ordinal: 26000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
m-3 package-and-ship definition promises: move repo to ~/Projects, private GitHub remote, semver discipline, setup guide. Its current members (TASK-23/27/24) do not cover these ship steps — without this task, m-3 would close while its definition is unmet. Reconcile with the npm-CLI shipping decisions from TASK-28 when it lands.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Repo lives at ~/Projects (or documented equivalent) with a private GitHub remote configured
- [x] #2 Semver versioning discipline recorded (tagging convention or release notes location)
- [x] #3 Setup guide exists covering fresh-machine bootstrap of the harness
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-09-05 cleanup: the preparatory research doc (docs/research/2026-09-03-loopeng-packaged-distribution.md) was rebased onto main and merged (conflict resolved in research index). Task remains To Do — AC #1/#2/#3 (repo move, semver, setup guide) still unstarted. Pending context: no git remote configured; branch task/TASK-34 deleted post-merge.

2026-09-06 DAG cleanup: ACs verified with fresh evidence — AC#1 repo at ~/Projects/weavelog with private remote git@github.com:shabib87/weavelog.git (gh api visibility=PRIVATE); AC#2 semver via release-please over Conventional Commits (CHANGELOG.md:5, package.json version 0.1.0); AC#3 fresh-machine bootstrap documented in README (weavelog init, lines 39/99). Dissolution per TASK-45 Step 4.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
All three ACs satisfied as side effects of TASK-45 Step 4: repo moved to ~/Projects/weavelog with private GitHub remote; semver discipline recorded (release-please over Conventional Commits, CHANGELOG seed, version 0.1.0); setup guide = README quickstart + weavelog init. Closed as part of the 2026-09-06 DAG cleanup pass (human-approved).
<!-- SECTION:FINAL_SUMMARY:END -->
