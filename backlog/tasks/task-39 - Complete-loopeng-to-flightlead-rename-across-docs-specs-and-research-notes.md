---
id: TASK-39
title: 'Complete loopeng-to-flightlead rename across docs, specs, and research notes'
status: To Do
assignee: []
created_date: '2026-09-04 17:52'
labels: []
dependencies: []
references:
  - TASK-34
  - TASK-29
  - docs/research/2026-09-03-loopeng-packaged-distribution.md
  - docs/research/2026-09-02-oss-agent-harnesses.md
ordinal: 30000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The OSS name is now flightlead: repo renamed and pushed to github.com/shabib87/flightlead (private), package.json/bin/CLI-help/README updated, tests green. Remaining: every doc-level occurrence of loopeng. Sweep targets: ~/Projects/flightlead docs/ (NORTH_STAR, PRODUCT, ROADMAP, PROGRESS, NEXT_SESSION, INDEX, ADR 0001, specs, research notes), ~/.agents docs/research/ (loopeng-helper-plan.md etc.), backlog task bodies (reference only, do not rewrite history). Keep 'formerly codenamed loopeng' once in README; everywhere else use flightlead. Decision provenance: 8-batch naming research concluded 2026-09-04; flightlead is the only candidate clean on npm+PyPI+GitHub+dev.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 grep -ri loopeng on ~/Projects/flightlead returns hits only in archived/superseded docs and the single formerly-codenamed README note
- [ ] #2 grep -ri loopeng on ~/.agents docs/ returns only research notes explicitly marked as historical (pre-rename)
- [ ] #3 package.json name, bin key, and CLI --help all say flightlead (already done, verify)
- [ ] #4 npm view flightlead confirms registry name is available before any publish attempt
<!-- AC:END -->
