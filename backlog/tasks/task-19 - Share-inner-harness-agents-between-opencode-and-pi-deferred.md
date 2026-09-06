---
id: TASK-19
title: Share inner-harness agents between opencode and pi (deferred)
status: To Do
assignee: []
created_date: '2026-08-29 02:49'
updated_date: '2026-09-05 22:58'
labels:
  - deferred
  - harness
milestone: m-4
dependencies:
  - TASK-28
references:
  - ~/.config/opencode/agents/implementer.md
  - ~/.agents/AGENTS.md
  - ~/.config/opencode/AGENTS.md
  - ~/.pi/agent/AGENTS.md
priority: low
type: task
ordinal: 12000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Share inner-harness agents between opencode and pi (deferred). DEFERRAL TRIGGER FUNCTIONALLY FIRED: config/agents/ now holds 16 stable tracked agents (TASK-23/27 pattern) — the "3-5 stable agents" gate is moot. Re-scope at pickup: likely subsumed by config/harnesses/pi.json materialization (candidates A/B symlink schemes may be dead). Design session must consume the harness-manifest contract from TASK-28 cli-vision doc before picking a sharing mechanism.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A separate thinking/design session has happened; the shared-source approach is chosen (candidate A: inner-harness ~/.agents/agents/<name>.md as canonical, symlinked into both native dirs; candidate B: opencode dir canonical, pi symlinks to it).
- [ ] #2 Probes done before committing to a union frontmatter: (1) does pi accept openrouter/<model> model strings or need the bare form; (2) does pi derive name from filename when name frontmatter is absent; (3) does opencode tolerate unknown pi frontmatter fields (pi tolerates unknowns for skills, agents unverified).
- [ ] #3 The conductor-pattern root AGENTS.md dedupe is scoped separately (three overlapping global AGENTS.md today: ~/.pi/agent/AGENTS.md, ~/.config/opencode/AGENTS.md, ~/.agents/AGENTS.md). Do not bundle it into this task.
- [ ] #4 No symlink or union-format change is made until the design session picks the approach.
<!-- AC:END -->
