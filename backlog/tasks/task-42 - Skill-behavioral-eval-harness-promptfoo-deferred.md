---
id: TASK-42
title: Skill behavioral-eval harness (promptfoo) - deferred
status: To Do
assignee: []
created_date: '2026-09-04 20:49'
labels: []
dependencies: []
references:
  - 'https://github.com/DietrichGebert/ponytail'
  - 'https://github.com/addyosmani/agent-skills'
priority: low
ordinal: 32000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Named deferral from ponytail evaluation (TASK-41). KIND: decision-type unknown - needs a tool-selection rubric run (promptfoo is a new dependency adoption) + human sign-off before pickup. Technique source: DietrichGebert/ponytail benchmarks/promptfooconfig.yaml (MIT) - arms (baseline / control / candidate), multiple models, metric-tagged deterministic assertions, git-diff scoring. Purpose: behavioral regression gate for skills - the harness today has only static evals (skill-spec description-collision policy); nothing detects that a skill edit changed runtime behavior. TRIGGER to pick up: first skill behavioral regression that static review misses, or when TASK-33 AC#4 collision policy wants executable backing. Attribution if built: file-header comment pinned to upstream SHA; vendor any control-arm asset with third-party notice (ponytail vendors caveman MIT the same way).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 WHEN the harness is picked up for this task THEN a tool-selection rubric run (promptfoo vs alternatives) and a human design pass happen BEFORE any implementation
- [ ] #2 WHEN the harness exists THEN it runs N arms (baseline/control/candidate) with deterministic metric-tagged assertions and fails on behavioral regression
<!-- AC:END -->
